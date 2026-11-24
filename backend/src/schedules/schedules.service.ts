import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { Route } from '../routes/entities/route.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Fare } from '../fares/entities/fare.entity';
import { FaresService } from '../fares/fares.service';
import { Vehicle } from '../transport/entities/vehicle.entity';
import { Operator } from '../transport/entities/operator.entity';

export interface ScheduleQuery {
  origin?: string;
  destination?: string;
  routeId?: number;
  date?: string;
  availableOnly?: boolean;
  page?: number;
  pageSize?: number;
  limit?: number;
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(Operator) private operators: Repository<Operator>,
    private readonly faresService: FaresService,
  ) {}

  async create(dto: CreateScheduleDto) {
    let route: Route | null = null;
    if (dto.routeId)
      route = await this.routes.findOne({ where: { id: dto.routeId } });
    if (!route && dto.origin && dto.destination) {
      route = await this.routes
        .createQueryBuilder('route')
        .leftJoinAndSelect('route.originStop', 'origin')
        .leftJoinAndSelect('route.destinationStop', 'destination')
        .where('origin.name ILIKE :origin', { origin: `%${dto.origin}%` })
        .andWhere('destination.name ILIKE :destination', {
          destination: `%${dto.destination}%`,
        })
        .getOne();
    }
    if (!route) throw new NotFoundException('Route not found');
    const departure = this.dateTimeParts(dto.departureTime);
    const arrival = this.dateTimeParts(dto.arrivalTime);
    this.validateTimes(dto.departureTime, dto.arrivalTime);
    if (Number(dto.fare) <= 0) {
      throw new BadRequestException('Fare must be greater than zero');
    }
    const vehicle = dto.vehicleId
      ? await this.vehicles.findOne({ where: { id: dto.vehicleId } })
      : await this.vehicles.findOne({ where: { name: dto.vehicleName } });
    if (dto.vehicleId && !vehicle)
      throw new NotFoundException('Vehicle not found');
    const operator = dto.operatorId
      ? await this.operators.findOne({ where: { id: dto.operatorId } })
      : null;
    if (dto.operatorId && !operator)
      throw new NotFoundException('Operator not found');
    const schedule = this.schedules.create({
      routeId: route.id,
      vehicleId: vehicle?.id ?? null,
      operatorId: operator?.id ?? null,
      departureStopId: route.originStopId,
      serviceDate: departure.date,
      arrivalDate: arrival.date,
      departureTime: departure.time,
      arrivalAt: arrival.time,
      fare: dto.fare,
      currency: dto.currency,
      totalSeats: dto.totalSeats,
      originName: dto.origin ?? route.originStop?.name ?? null,
      destinationName: dto.destination ?? route.destinationStop?.name ?? null,
      operatorName:
        dto.operatorName ?? operator?.name ?? route.companyName ?? null,
      routeName: dto.routeName ?? route.roadName ?? route.name,
      vehicleName:
        dto.vehicleName ?? vehicle?.name ?? vehicle?.plateNumber ?? null,
      transportMode: dto.transportMode ?? vehicle?.vehicleType ?? null,
      daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      isActive: true,
    } as Partial<Schedule>);
    const saved = await this.schedules.save(schedule);
    const loadedSchedule = await this.loadSchedule(saved.id);
    return this.formatTrip(loadedSchedule, departure.date);
  }

  async findAll(query: ScheduleQuery = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query.limit ?? query.pageSize) || 20),
    );
    if (query.date && !this.isValidDate(query.date)) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD date');
    }

    const schedules = await this.schedules.find({
      where: {
        isActive: true,
        ...(query.routeId ? { routeId: query.routeId } : {}),
      },
      relations: {
        vehicle: { driver: true },
        route: {
          originStop: true,
          destinationStop: true,
          routeStops: { stop: true },
        },
        departureStop: true,
      },
      order: { departureTime: 'ASC' },
    });

    const filtered = [];
    for (const schedule of schedules) {
      const requestedDate = query.date ?? schedule.serviceDate ?? today;
      if (
        query.date &&
        schedule.serviceDate &&
        schedule.serviceDate !== query.date
      )
        continue;
      if (query.date && !this.runsOnDate(schedule.daysOfWeek, requestedDate))
        continue;
      if (!query.date && schedule.serviceDate && schedule.serviceDate < today)
        continue;
      const routeStops = [...(schedule.route?.routeStops ?? [])].sort(
        (a, b) => a.sequence - b.sequence,
      );
      const originStop = query.origin
        ? routeStops.find((item) =>
            item.stop?.name
              ?.toLowerCase()
              .includes(query.origin!.toLowerCase()),
          )
        : undefined;
      const destinationStop = query.destination
        ? routeStops.find((item) =>
            item.stop?.name
              ?.toLowerCase()
              .includes(query.destination!.toLowerCase()),
          )
        : undefined;
      if (query.origin && !originStop) continue;
      if (query.destination && !destinationStop) continue;
      if (
        originStop &&
        destinationStop &&
        originStop.sequence >= destinationStop.sequence
      )
        continue;
      const trip = await this.formatTrip(
        schedule,
        requestedDate,
        originStop?.stopId,
        destinationStop?.stopId,
      );
      if (query.availableOnly && trip.availableSeats.length === 0) continue;
      filtered.push(trip);
    }

    const total = filtered.length;
    return {
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findAdminAll() {
    const schedules = await this.schedules.find({
      relations: {
        vehicle: { driver: true },
        route: { originStop: true, destinationStop: true },
        departureStop: true,
      },
      order: { departureTime: 'ASC' },
    });
    return Promise.all(
      schedules.map((schedule) =>
        this.formatTrip(schedule, schedule.serviceDate ?? undefined),
      ),
    );
  }

  async findOne(id: number, date?: string) {
    const schedule = await this.loadSchedule(id);
    if (date && !this.isValidDate(date)) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD date');
    }
    if (date && schedule.serviceDate && date !== schedule.serviceDate) {
      throw new NotFoundException(
        'Schedule does not operate on the requested date',
      );
    }
    if (date && !this.runsOnDate(schedule.daysOfWeek, date)) {
      throw new NotFoundException(
        'Schedule does not operate on the requested date',
      );
    }
    return this.formatTrip(schedule, date ?? schedule.serviceDate ?? undefined);
  }

  async getSeats(id: number, date?: string) {
    const schedule = await this.loadSchedule(id);
    const travelDate =
      date ?? schedule.serviceDate ?? new Date().toISOString().slice(0, 10);
    if (!this.isValidDate(travelDate)) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD date');
    }
    if (schedule.serviceDate && travelDate !== schedule.serviceDate) {
      throw new NotFoundException(
        'Schedule does not operate on the requested date',
      );
    }
    if (!this.runsOnDate(schedule.daysOfWeek, travelDate)) {
      throw new NotFoundException(
        'Schedule does not operate on the requested date',
      );
    }
    const bookedSeats = await this.bookedSeatNumbers(id, travelDate);
    const occupied = new Set(bookedSeats);
    const capacity = Math.min(
      42,
      Number(schedule.totalSeats ?? schedule.vehicle?.capacity ?? 42),
    );
    const availableSeats = Array.from(
      { length: capacity },
      (_, index) => index + 1,
    ).filter((seat) => !occupied.has(seat));
    return {
      scheduleId: String(id),
      totalSeats: capacity,
      bookedSeats: [...occupied].sort((a, b) => a - b),
      availableSeats,
    };
  }

  async update(id: number, dto: UpdateScheduleDto) {
    const existing = await this.loadSchedule(id);
    const departure =
      dto.departureTime !== undefined
        ? this.dateTimeParts(dto.departureTime)
        : {
            date: existing.serviceDate,
            time: existing.departureTime,
          };
    const arrival =
      dto.arrivalTime !== undefined
        ? this.dateTimeParts(dto.arrivalTime)
        : {
            date: existing.arrivalDate ?? existing.serviceDate,
            time: existing.arrivalAt,
          };
    this.validateTimes(
      `${departure.date ?? new Date().toISOString().slice(0, 10)}T${departure.time}Z`,
      arrival.time
        ? `${arrival.date ?? departure.date ?? new Date().toISOString().slice(0, 10)}T${arrival.time}Z`
        : undefined,
    );
    if (dto.fare !== undefined && Number(dto.fare) <= 0) {
      throw new BadRequestException('Fare must be greater than zero');
    }
    await this.schedules.update(id, {
      ...(dto.routeId !== undefined ? { routeId: dto.routeId } : {}),
      ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
      ...(dto.operatorId !== undefined ? { operatorId: dto.operatorId } : {}),
      ...(dto.departureTime !== undefined
        ? { serviceDate: departure.date, departureTime: departure.time }
        : {}),
      ...(dto.arrivalTime !== undefined
        ? { arrivalDate: arrival.date, arrivalAt: arrival.time }
        : {}),
      ...(dto.fare !== undefined ? { fare: dto.fare } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.totalSeats !== undefined ? { totalSeats: dto.totalSeats } : {}),
      ...(dto.origin !== undefined ? { originName: dto.origin } : {}),
      ...(dto.destination !== undefined
        ? { destinationName: dto.destination }
        : {}),
      ...(dto.operatorName !== undefined
        ? { operatorName: dto.operatorName }
        : {}),
      ...(dto.routeName !== undefined ? { routeName: dto.routeName } : {}),
      ...(dto.vehicleName !== undefined
        ? { vehicleName: dto.vehicleName }
        : {}),
      ...(dto.transportMode !== undefined
        ? { transportMode: dto.transportMode }
        : {}),
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const schedule = await this.loadSchedule(id);
    const bookingCount = await this.bookings.count({
      where: { scheduleId: id },
    });
    if (bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete a schedule with existing bookings',
      );
    }
    await this.schedules.remove(schedule);
    return undefined;
  }

  private async loadSchedule(id: number) {
    const schedule = await this.schedules.findOne({
      where: { id },
      relations: {
        vehicle: { driver: true },
        route: {
          originStop: true,
          destinationStop: true,
          routeStops: { stop: true },
        },
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
    const travelDate =
      date ?? schedule.serviceDate ?? new Date().toISOString().slice(0, 10);
    const capacity = Math.min(
      42,
      Number(schedule.totalSeats ?? schedule.vehicle?.capacity ?? 42),
    );
    const route = schedule.route;
    const routeFare =
      route?.originStopId != null && route.destinationStopId != null
        ? await this.fares.findOne({
            where: {
              routeId: schedule.routeId,
              originStopId: route.originStopId,
              destinationStopId: route.destinationStopId,
            },
          })
        : null;
    const partJourneyFare =
      originStopId && destinationStopId
        ? await this.faresService.fareBetween(
            schedule.routeId,
            originStopId,
            destinationStopId,
          )
        : null;
    const fare =
      partJourneyFare ??
      (schedule.fare != null
        ? Number(schedule.fare)
        : routeFare
          ? Number(routeFare.amount)
          : null);
    const booked = await this.bookedSeatNumbers(schedule.id, travelDate);
    const departureIso = this.toIsoDateTime(travelDate, schedule.departureTime);
    const arrivalIso = schedule.arrivalAt
      ? this.toIsoDateTime(
          schedule.arrivalDate ?? travelDate,
          schedule.arrivalAt,
        )
      : null;
    return {
      id: String(schedule.id),
      routeId: String(schedule.routeId),
      route: {
        id: String(schedule.routeId),
        roadName: route?.roadName ?? route?.name ?? null,
        originStop: route?.originStop
          ? { id: route.originStop.id, name: route.originStop.name }
          : null,
        destinationStop: route?.destinationStop
          ? { id: route.destinationStop.id, name: route.destinationStop.name }
          : null,
      },
      origin:
        schedule.originName ??
        schedule.departureStop?.name ??
        route?.originStop?.name ??
        null,
      destination:
        schedule.destinationName ?? route?.destinationStop?.name ?? null,
      departureTime: departureIso,
      arrivalTime: arrivalIso,
      departureAt: departureIso,
      fare,
      currency: schedule.currency ?? routeFare?.currency ?? 'MWK',
      totalSeats: capacity,
      bookedSeats: [...new Set(booked)].sort((a, b) => a - b),
      availableSeats: Array.from(
        { length: capacity },
        (_, index) => index + 1,
      ).filter((seat) => !booked.includes(seat)),
      routeName: schedule.routeName ?? route?.roadName ?? route?.name ?? null,
      operatorName: schedule.operatorName ?? route?.companyName ?? null,
      vehicleName:
        schedule.vehicleName ??
        schedule.vehicle?.name ??
        schedule.vehicle?.plateNumber ??
        null,
      transportMode:
        schedule.transportMode ?? schedule.vehicle?.vehicleType ?? null,
    };
  }

  private async bookedSeatNumbers(
    scheduleId: number,
    travelDate: string,
  ): Promise<number[]> {
    const bookings = await this.bookings.find({
      where: {
        scheduleId,
        travelDate,
        status: In([
          BookingStatus.DRAFT,
          BookingStatus.REVIEWED,
          BookingStatus.PAID,
          BookingStatus.CONFIRMED,
        ]),
      },
      relations: { seats: true },
    });
    const now = Date.now();
    return [
      ...new Set(
        bookings.flatMap((booking) => {
          const activeHold =
            (booking.status === BookingStatus.DRAFT ||
              booking.status === BookingStatus.REVIEWED) &&
            booking.holdExpiresAt !== null &&
            booking.holdExpiresAt !== undefined &&
            booking.holdExpiresAt.getTime() > now;
          if (
            (booking.status === BookingStatus.DRAFT ||
              booking.status === BookingStatus.REVIEWED) &&
            !activeHold
          ) {
            return [];
          }
          return (booking.seats ?? [])
            .filter((seat) => seat.active)
            .map((seat) => Number(seat.seatNumber));
        }),
      ),
    ].sort((a, b) => a - b);
  }

  private validateTimes(departureTime: string, arrivalTime?: string) {
    if (!arrivalTime) return;
    if (new Date(arrivalTime).getTime() <= new Date(departureTime).getTime()) {
      throw new BadRequestException('Arrival must be after departure');
    }
  }

  private dateTimeParts(value: string) {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      throw new BadRequestException('A valid ISO 8601 date-time is required');
    }
    const iso = parsed.toISOString();
    return {
      date: iso.slice(0, 10),
      time: iso.slice(11, 19),
    };
  }

  private toIsoDateTime(date: string, time: string) {
    return new Date(`${date}T${time}Z`).toISOString();
  }

  private isValidDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  }

  private runsOnDate(days: string[], date: string) {
    const day = new Date(`${date}T00:00:00Z`)
      .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
      .toUpperCase();
    return (days ?? []).some((value) => value.toUpperCase().startsWith(day));
  }
}
