import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { Route } from '../routes/entities/route.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Fare } from '../fares/entities/fare.entity';
import { FaresService } from '../fares/fares.service';

export interface ScheduleQuery {
  origin?: string;
  destination?: string;
  routeId?: number;
  date?: string;
  availableOnly?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    private readonly faresService: FaresService,
  ) {}

  async create(dto: CreateScheduleDto) {
    const route = await this.routes.findOne({ where: { id: dto.routeId } });
    if (!route) throw new NotFoundException('Route not found');
    this.validateTimes(dto.departureTime, dto.arrivalAt);
    if (dto.fare !== undefined && Number(dto.fare) <= 0) {
      throw new BadRequestException('Fare must be greater than zero');
    }
    return this.schedules.save(this.schedules.create({ ...dto }));
  }

  async findAll(query: ScheduleQuery = {}) {
    if (!query.date) throw new BadRequestException('date query parameter is required (YYYY-MM-DD)');
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    if (query.date && !this.isValidDate(query.date)) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD date');
    }

    const schedules = await this.schedules.find({
      where: { isActive: true, ...(query.routeId ? { routeId: query.routeId } : {}) },
      relations: {
        vehicle: { driver: true },
        route: { originStop: true, destinationStop: true, routeStops: { stop: true } },
        departureStop: true,
      },
      order: { departureTime: 'ASC' },
    });

    const filtered = [];
    for (const schedule of schedules) {
      if (query.date && !this.runsOnDate(schedule.daysOfWeek, query.date)) continue;
      const routeStops = [...(schedule.route?.routeStops ?? [])].sort((a, b) => a.sequence - b.sequence);
      const originStop = query.origin
        ? routeStops.find((item) => item.stop?.name?.toLowerCase().includes(query.origin!.toLowerCase()))
        : undefined;
      const destinationStop = query.destination
        ? routeStops.find((item) => item.stop?.name?.toLowerCase().includes(query.destination!.toLowerCase()))
        : undefined;
      if (query.origin && !originStop) continue;
      if (query.destination && !destinationStop) continue;
      if (originStop && destinationStop && originStop.sequence >= destinationStop.sequence) continue;
      const trip = await this.formatTrip(
        schedule,
        query.date,
        originStop?.stopId,
        destinationStop?.stopId,
      );
      if (query.availableOnly && trip.availableSeats <= 0) continue;
      filtered.push(trip);
    }

    const total = filtered.length;
    return {
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findAdminAll() {
    const schedules = await this.schedules.find({
      relations: { vehicle: { driver: true }, route: { originStop: true, destinationStop: true }, departureStop: true },
      order: { departureTime: 'ASC' },
    });
    return schedules;
  }

  async findOne(id: number, date?: string) {
    const schedule = await this.loadSchedule(id);
    if (date && !this.isValidDate(date)) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD date');
    }
    if (date && !this.runsOnDate(schedule.daysOfWeek, date)) {
      throw new NotFoundException('Schedule does not operate on the requested date');
    }
    return this.formatTrip(schedule, date);
  }

  async getSeats(id: number, date: string) {
    if (!date || !this.isValidDate(date)) {
      throw new BadRequestException('A valid date query parameter (YYYY-MM-DD) is required');
    }
    const schedule = await this.loadSchedule(id);
    if (!this.runsOnDate(schedule.daysOfWeek, date)) {
      throw new NotFoundException('Schedule does not operate on the requested date');
    }
    const confirmed = await this.bookings.find({
      where: { scheduleId: id, travelDate: date, status: BookingStatus.CONFIRMED },
      select: { seatNumber: true },
    });
    const occupied = confirmed.map((booking) => booking.seatNumber);
    const capacity = Number(schedule.vehicle?.capacity ?? 0);
    const availableCount = Math.max(0, capacity - occupied.length);
    // This codebase has no seat-hold entity/service. Held seats are therefore
    // reported as zero rather than guessed from unrelated booking states.
    return {
      scheduleId: id,
      date,
      capacity,
      availableSeats: availableCount,
      occupiedSeats: occupied.length,
      heldSeats: 0,
    };
  }

  async update(id: number, dto: UpdateScheduleDto) {
    const existing = await this.loadSchedule(id);
    this.validateTimes(dto.departureTime ?? existing.departureTime, dto.arrivalAt ?? existing.arrivalAt);
    if (dto.fare !== undefined && Number(dto.fare) <= 0) {
      throw new BadRequestException('Fare must be greater than zero');
    }
    await this.schedules.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const schedule = await this.loadSchedule(id);
    const bookingCount = await this.bookings.count({ where: { scheduleId: id } });
    if (bookingCount > 0) {
      throw new ConflictException('Cannot delete a schedule with existing bookings');
    }
    await this.schedules.remove(schedule);
    return { deleted: true, id };
  }

  private async loadSchedule(id: number) {
    const schedule = await this.schedules.findOne({
      where: { id },
      relations: {
        vehicle: { driver: true },
        route: { originStop: true, destinationStop: true, routeStops: { stop: true } },
        departureStop: true,
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  private async formatTrip(
    schedule: Schedule,
    date?: string,
    originStopId?: number,
    destinationStopId?: number,
  ) {
    const travelDate = date ?? new Date().toISOString().slice(0, 10);
    const bookingCount = await this.bookings.count({
      where: { scheduleId: schedule.id, travelDate, status: BookingStatus.CONFIRMED },
    });
    const capacity = Number(schedule.vehicle?.capacity ?? 0);
    const route = schedule.route;
    const routeFare = await this.fares.findOne({
      where: {
        routeId: schedule.routeId,
        originStopId: route?.originStopId,
        destinationStopId: route?.destinationStopId,
      },
    });
    const partJourneyFare = originStopId && destinationStopId
      ? await this.faresService.fareBetween(schedule.routeId, originStopId, destinationStopId)
      : null;
    const fare = partJourneyFare ?? (schedule.fare != null ? Number(schedule.fare) : routeFare ? Number(routeFare.amount) : null);
    return {
      id: schedule.id,
      routeId: schedule.routeId,
      departureAt: date ? `${date}T${schedule.departureTime}` : schedule.departureTime,
      arrivalAt: schedule.arrivalAt && date ? `${date}T${schedule.arrivalAt}` : schedule.arrivalAt,
      fare,
      currency: routeFare?.currency ?? 'MWK',
      capacity,
      availableSeats: Math.max(0, capacity - bookingCount),
      routeName: route?.name ?? null,
      operatorName: null,
      transportMode: schedule.vehicle?.vehicleType ?? null,
      departureStop: schedule.departureStop?.name ?? route?.originStop?.name ?? null,
      destination: route?.destinationStop?.name ?? null,
      daysOfWeek: schedule.daysOfWeek,
      travelDate: date ?? null,
    };
  }

  private validateTimes(departureTime?: string, arrivalAt?: string | null) {
    if (!departureTime || !arrivalAt) return;
    if (arrivalAt <= departureTime) {
      throw new BadRequestException('Arrival must be after departure');
    }
  }

  private isValidDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  }

  private runsOnDate(days: string[], date: string) {
    const day = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
    return (days ?? []).some((value) => value.toUpperCase().startsWith(day));
  }
}
