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
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Route } from '../routes/entities/route.entity';
import { User, UserRole } from '../auth/entities/user.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private async assertDriver(driverId?: number) {
    if (driverId === undefined || driverId === null) return;
    const user = await this.users.findOne({ where: { id: driverId } });
    if (!user) {
      throw new BadRequestException(`Driver ${driverId} not found`);
    }
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequestException(
        `User ${driverId} is not a driver (role: ${user.role})`,
      );
    }
    if (!user.isActive) {
      throw new BadRequestException(`Driver ${driverId} is inactive`);
    }
  }

  async create(dto: CreateScheduleDto) {
    await this.assertDriver(dto.driverId);

    const existing = await this.schedules.findOne({
      where: { routeId: dto.routeId, departureTime: dto.departureTime },
    });
    if (existing) {
      throw new ConflictException('Schedule already exists for this route and time');
    }

    const schedule = this.schedules.create(dto);
    return this.schedules.save(schedule);
  }

  async findAll(routeId?: number) {
    const where = routeId ? { routeId } : {};
    return this.schedules.find({ where, order: { departureTime: 'ASC' } });
  }

  async findOne(id: number) {
    const schedule = await this.schedules.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async update(id: number, dto: UpdateScheduleDto) {
    await this.findOne(id);
    await this.assertDriver(dto.driverId);
    await this.schedules.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const schedule = await this.findOne(id);
    await this.schedules.remove(schedule);
    return { deleted: true, id };
  }

  async getAvailability(id: number, travelDate: string) {
    const schedule = await this.findOne(id);

    const bookedSeatsResult = await this.schedules.manager
      .createQueryBuilder(Booking, 'booking')
      .select('SUM(booking.seats)', 'total')
      .where('booking.scheduleId = :id', { id })
      .andWhere('booking.travelDate = :travelDate', { travelDate })
      .andWhere('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .getRawOne();

    const bookedSeats = Number(bookedSeatsResult?.total) || 0;
    const availableSeats = Math.max(0, schedule.seatCapacity - bookedSeats);

    return {
      scheduleId: id,
      travelDate,
      totalCapacity: schedule.seatCapacity,
      bookedSeats,
      availableSeats,
    };
  }

  // Moved from SearchService — batched queries instead of per-schedule loops.
  async searchDepartures(
    originStopId: number,
    destinationStopId: number,
    date?: string,
  ) {
    const routes = await this.routes.find({
      where: { originStopId, destinationStopId, isActive: true },
    });
    if (!routes.length) return [];

    const routeIds = routes.map((r) => r.id);

    const scheduleRows = await this.schedules
      .createQueryBuilder('schedule')
      .where('schedule.routeId IN (:...routeIds)', { routeIds })
      .andWhere('schedule.isActive = true')
      .getMany();

    if (!scheduleRows.length) return [];

    // Batched seat availability per schedule
    const scheduleIds = scheduleRows.map((s) => s.id);
    const bookedBySchedule = new Map<number, number>();
    if (date) {
      const rows = await this.schedules.manager
        .createQueryBuilder(Booking, 'b')
        .select('b.scheduleId', 'scheduleId')
        .addSelect('SUM(b.seats)', 'total')
        .where('b.scheduleId IN (:...scheduleIds)', { scheduleIds })
        .andWhere('b.travelDate = :date', { date })
        .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
        .groupBy('b.scheduleId')
        .getRawMany();
      for (const r of rows) {
        bookedBySchedule.set(Number(r.scheduleId), Number(r.total) || 0);
      }
    }

    // Batched fares keyed by routeId
    const faresByRoute = new Map<number, Fare>();
    const fareRows = await this.fares.find({
      where: { originStopId, destinationStopId },
    });
    for (const f of fareRows) {
      if (f.routeId != null) faresByRoute.set(f.routeId, f);
    }

    return scheduleRows.map((schedule) => {
      const booked = bookedBySchedule.get(schedule.id) ?? 0;
      const availableSeats = Math.max(0, schedule.seatCapacity - booked);
      const fare = faresByRoute.get(schedule.routeId);
      return {
        schedule,
        route: schedule.route,
        availableSeats,
        fare: fare ? { amount: fare.amount, currency: fare.currency } : null,
      };
    });
  }
}