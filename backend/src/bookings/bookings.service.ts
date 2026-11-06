import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Route } from '../routes/entities/route.entity';
import { UserRole } from '../auth/entities/user.entity';

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const dayOf = (date: string) => DAYS[new Date(`${date}T00:00:00`).getDay()];
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const hhmm = (t: string) => t.slice(0, 5);
const runsOn = (s: Schedule, date: string) =>
  s.daysOfWeek.some((d) => d.toUpperCase().slice(0, 3) === dayOf(date));
const routeName = (s?: Schedule) =>
  (s?.route as unknown as { name?: string } | undefined)?.name ?? null;

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
    @InjectRepository(Route) private routes: Repository<Route>,
    private dataSource: DataSource,
  ) {}

  private assertDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }
  }

  private async getSchedule(id: number) {
    const schedule = await this.schedules.findOne({ where: { id } });
    if (!schedule || !schedule.isActive) {
      throw new NotFoundException('Schedule not found or inactive');
    }
    return schedule;
  }

  private confirmedFor(date: string, scheduleId?: number) {
    return this.bookings.find({
      where: {
        travelDate: date,
        status: BookingStatus.CONFIRMED,
        ...(scheduleId ? { scheduleId } : {}),
      },
      loadEagerRelations: false,
    });
  }

  // ---------- Dropdown data ----------

  async scheduleOptions(date?: string) {
    if (date) this.assertDate(date);
    let list = await this.schedules.find({
      where: { isActive: true },
      order: { departureTime: 'ASC' },
    });
    if (date) list = list.filter((s) => runsOn(s, date));

    const booked = new Map<number, number>();
    if (date) {
      for (const b of await this.confirmedFor(date)) {
        booked.set(b.scheduleId, (booked.get(b.scheduleId) ?? 0) + b.seats);
      }
    }

    return list.map((s) => ({
      id: s.id,
      label: `${routeName(s) ?? `Route ${s.routeId}`}, ${hhmm(s.departureTime)} (${s.daysOfWeek.join('/')})`,
      departureTime: s.departureTime,
      daysOfWeek: s.daysOfWeek,
      seatCapacity: s.seatCapacity,
      availableSeats: date ? s.seatCapacity - (booked.get(s.id) ?? 0) : null,
    }));
  }

  async stopOptions() {
    const stops = await this.stops.find({ order: { name: 'ASC' } });
    return stops.map((s) => ({ id: s.id, label: s.name }));
  }

  async routeOptions() {
    const list = await this.routes.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return list.map((r) => ({
      id: r.id,
      label: `${r.name} (${r.originStop?.name} to ${r.destinationStop?.name})`,
    }));
  }

  async availability(scheduleId: number, travelDate: string) {
    this.assertDate(travelDate);
    const schedule = await this.getSchedule(scheduleId);
    const taken = (await this.confirmedFor(travelDate, scheduleId))
      .flatMap((b) => b.seatNumbers ?? [])
      .sort((a, b) => a - b);
    const takenSet = new Set(taken);
    const available: number[] = [];
    for (let s = 1; s <= schedule.seatCapacity; s++) {
      if (!takenSet.has(s)) available.push(s);
    }
    return {
      scheduleId,
      travelDate,
      runsOnThisDate: runsOn(schedule, travelDate),
      seatCapacity: schedule.seatCapacity,
      takenSeats: taken,
      availableSeats: available,
    };
  }

  // ---------- Bookings ----------

  async create(userId: number, dto: CreateBookingDto) {
    const schedule = await this.getSchedule(dto.scheduleId);

    this.assertDate(dto.travelDate);
    const today = todayString();
    if (dto.travelDate < today) {
      throw new BadRequestException('Travel date cannot be in the past');
    }
    if (dto.travelDate === today && hhmm(schedule.departureTime) < nowTime()) {
      throw new BadRequestException('This trip has already departed today');
    }
    if (!runsOn(schedule, dto.travelDate)) {
      throw new BadRequestException(
        `This trip does not run on ${dayOf(dto.travelDate)}. It runs on: ${schedule.daysOfWeek.join(', ')}`,
      );
    }
    if (dto.originStopId === dto.destinationStopId) {
      throw new BadRequestException('Origin and destination must be different');
    }
    if (dto.seatNumbers.some((s) => s > schedule.seatCapacity)) {
      throw new BadRequestException(
        `Seat numbers must be between 1 and ${schedule.seatCapacity}`,
      );
    }

    const fare = await this.fares.findOne({
      where: {
        originStopId: dto.originStopId,
        destinationStopId: dto.destinationStopId,
      },
    });
    const estimatedFare = fare ? Number(fare.amount) * dto.seatNumbers.length : 0;
    const reference = `BKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const bookingId = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [dto.scheduleId]);

      const existing = await manager.find(Booking, {
        where: {
          scheduleId: dto.scheduleId,
          travelDate: dto.travelDate,
          status: BookingStatus.CONFIRMED,
        },
        loadEagerRelations: false,
      });
      const taken = new Set(existing.flatMap((b) => b.seatNumbers ?? []));
      const clash = dto.seatNumbers.filter((s) => taken.has(s));
      if (clash.length) {
        throw new ConflictException(`Seats already booked: ${clash.join(', ')}`);
      }

      const saved = await manager.save(
        manager.create(Booking, {
          userId: Number(userId),
          scheduleId: dto.scheduleId,
          travelDate: dto.travelDate,
          originStopId: dto.originStopId,
          destinationStopId: dto.destinationStopId,
          seatNumbers: [...dto.seatNumbers].sort((a, b) => a - b),
          seats: dto.seatNumbers.length,
          estimatedFare,
          reference,
          status: BookingStatus.CONFIRMED,
        }),
      );
      return saved.id;
    });

    return this.bookings.findOne({ where: { id: bookingId } });
  }

  async findAll(user: AuthUser, status?: string) {
    const where: FindOptionsWhere<Booking> = {};
    if (user.role !== UserRole.ADMIN) where.userId = Number(user.userId);
    if (status) where.status = status as BookingStatus;
    return this.bookings.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, user: AuthUser) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (user.role !== UserRole.ADMIN && booking.userId !== Number(user.userId)) {
      throw new ForbiddenException('You can only view your own bookings');
    }
    return booking;
  }

  async cancel(id: number, user: AuthUser) {
    const booking = await this.findOne(id, user);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const now = new Date();
    const travel = new Date(booking.travelDate);
    const [hours, minutes] = booking.schedule.departureTime.split(':');
    travel.setHours(Number(hours), Number(minutes), 0, 0);
    if (now > travel) {
      throw new BadRequestException('Cannot cancel a booking after departure time');
    }

    booking.status = BookingStatus.CANCELLED;
    return this.bookings.save(booking);
  }

  async passengersBySchedule(user: AuthUser, date?: string) {
    if (date) this.assertDate(date);
    const isDriver = user.role === UserRole.DRIVER;

    const rows = await this.bookings.find({
      where: {
        status: BookingStatus.CONFIRMED,
        ...(date ? { travelDate: date } : {}),
        ...(isDriver ? { schedule: { driverId: Number(user.userId) } } : {}),
      },
      order: { travelDate: 'ASC', scheduleId: 'ASC', id: 'ASC' },
    });

    const groups = new Map<string, Booking[]>();
    for (const b of rows) {
      const key = `${b.scheduleId}|${b.travelDate}`;
      groups.set(key, [...(groups.get(key) ?? []), b]);
    }

    return [...groups.values()].map((list) => {
      const first = list[0];
      const s = first.schedule;
      const booked = list.reduce((n, b) => n + b.seats, 0);
      return {
        scheduleId: s.id,
        route: routeName(s),
        travelDate: first.travelDate,
        departureTime: hhmm(s.departureTime),
        vehicleInfo: s.vehicleInfo ?? null,
        passengerCount: booked,
        seatCapacity: s.seatCapacity,
        availableSeats: s.seatCapacity - booked,
        passengers: list.map((b) => ({
          bookingId: b.id,
          reference: b.reference,
          passengerName: b.user?.fullName ?? null,
          phoneNumber: b.user?.phoneNumber ?? null,
          seatNumbers: b.seatNumbers,
          from: b.originStop?.name ?? null,
          to: b.destinationStop?.name ?? null,
        })),
      };
    });
  }
}