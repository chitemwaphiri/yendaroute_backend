import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingSeat } from './entities/booking-seat.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';
import { Fare } from '../fares/entities/fare.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PassengerDetailsDto } from './dto/passenger-details.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { pageParams, paginated } from '../common/pagination';

type Actor = { userId: number; role?: string };

const TZ = 'Africa/Blantyre';
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// YYYY-MM-DD and HH:mm in Malawi time
const todayString = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const nowTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
const hhmm = (t: string) => t.slice(0, 5);
const isValidDate = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
};
const dayOf = (d: string) => DAYS[new Date(`${d}T00:00:00Z`).getUTCDay()];
const holdMinutes = () => Number(process.env.HOLD_MINUTES) || 10;
const isAdmin = (role?: string) => role === 'admin' || role === 'super_admin';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(BookingSeat) private seats: Repository<BookingSeat>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    private dataSource: DataSource,
  ) {}

  // ---------- create (draft + seat hold) ----------

  async create(userId: number, dto: CreateBookingDto, idempotencyKey?: string) {
    // Same key from the same user = same booking, never a second one
    if (idempotencyKey) {
      const existing = await this.bookings.findOne({ where: { userId, idempotencyKey } });
      if (existing) return this.toDto(existing);
    }

    await this.releaseExpiredHolds();

    if (!isValidDate(dto.travelDate)) {
      throw new BadRequestException('travelDate is not a valid date');
    }
    const schedule = await this.schedules.findOne({ where: { id: dto.scheduleId } });
    if (!schedule || !schedule.isActive) throw new NotFoundException('Schedule not found');

    const today = todayString();
    if (dto.travelDate < today) throw new BadRequestException('Travel date is in the past');
    const day = dayOf(dto.travelDate);
    if (!schedule.daysOfWeek.includes(day)) {
      throw new BadRequestException(`This schedule does not run on ${day}`);
    }
    if (dto.travelDate === today && hhmm(schedule.departureTime) <= nowTime()) {
      throw new BadRequestException('This trip has already departed');
    }

    // Seats must exist in this vehicle
    const capacity = schedule.vehicle?.capacity;
    if (!capacity) {
      throw new BadRequestException('This trip has no vehicle assigned yet');
    }
    const missing = dto.seatNumbers.filter((n) => n > capacity);
    if (missing.length) {
      throw new BadRequestException(
        `Seat ${missing.join(', ')} does not exist. This vehicle has ${capacity} seats`,
      );
    }

    // Both stops must be on the route, boarding before drop-off.
    // A schedule that starts at the last stop runs the route in reverse.
    const found = await this.dataSource.getRepository(RouteStop).find({
      where: { routeId: schedule.routeId },
      order: { sequence: 'ASC' },
    });
    if (!found.length) throw new BadRequestException('This route has no stops');
    const reversed = schedule.departureStopId === found[found.length - 1].stopId;
    const ordered = reversed ? [...found].reverse() : found;

    const originStopId = dto.originStopId ?? ordered[0].stopId;
    const destinationStopId = dto.destinationStopId ?? ordered[ordered.length - 1].stopId;
    const from = ordered.findIndex((rs) => rs.stopId === originStopId);
    const to = ordered.findIndex((rs) => rs.stopId === destinationStopId);
    if (from === -1 || to === -1) {
      throw new BadRequestException("Both stops must be on this schedule's route");
    }
    if (from >= to) {
      throw new BadRequestException('The drop-off stop must come after the boarding stop');
    }

    // The price is worked out here, never taken from the app.
    // Part 3's part-journey fare (fareBetween) will replace this lookup.
    const fare = await this.findFare(schedule.routeId, originStopId, destinationStopId);
    if (!fare) {
      throw new BadRequestException(
        'No fare is set for these stops yet, so this trip cannot be booked',
      );
    }
    const total = Number(fare.amount) * dto.seatNumbers.length;

    // Seats already held or sold
    const labels = dto.seatNumbers.map(String);
    const taken = await this.seats.find({
      where: {
        scheduleId: schedule.id,
        travelDate: dto.travelDate,
        seatNumber: In(labels),
        active: true,
      },
    });
    if (taken.length) {
      throw new ConflictException(
        `Seat ${taken.map((t) => t.seatNumber).join(', ')} is already taken`,
      );
    }

    try {
      const id = await this.dataSource.transaction(async (m: EntityManager) => {
        const booking = await m.save(
          Booking,
          m.create(Booking, {
            reference: `BKG-${randomBytes(4).toString('hex').toUpperCase()}`,
            userId,
            scheduleId: schedule.id,
            travelDate: dto.travelDate,
            originStopId,
            destinationStopId,
            fare: total,
            currency: fare.currency,
            status: BookingStatus.DRAFT,
            holdExpiresAt: new Date(Date.now() + holdMinutes() * 60_000),
            idempotencyKey: idempotencyKey ?? null,
            seatNumber: null,
          }),
        );
        await m.save(
          BookingSeat,
          labels.map((seatNumber) =>
            m.create(BookingSeat, {
              bookingId: booking.id,
              scheduleId: schedule.id,
              travelDate: dto.travelDate,
              seatNumber,
              active: true,
            }),
          ),
        );
        return booking.id;
      });
      return this.toDto(await this.loadOrFail(id));
    } catch (e: any) {
      // Unique violation: two requests raced for the same seat or the same key
      if (e?.code === '23505') {
        if (idempotencyKey) {
          const again = await this.bookings.findOne({ where: { userId, idempotencyKey } });
          if (again) return this.toDto(again);
        }
        throw new ConflictException('One of those seats was just taken. Please choose again.');
      }
      throw e;
    }
  }

  // ---------- read ----------

  async findMine(userId: number, q: QueryBookingsDto) {
    await this.releaseExpiredHolds();
    const { page, pageSize, skip, take } = pageParams(q);
    const where: any = { userId };
    if (q.status) where.status = q.status;
    if (q.scheduleId) where.scheduleId = q.scheduleId;
    if (q.date) where.travelDate = q.date;
    const [rows, total] = await this.bookings.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginated(rows.map((r) => this.toDto(r)), page, pageSize, total);
  }

  async findByReference(reference: string, actor: Actor) {
    await this.releaseExpiredHolds();
    const b = await this.bookings.findOne({ where: { reference } });
    // Someone else's booking looks the same as a missing one
    if (!b || (b.userId !== actor.userId && !isAdmin(actor.role))) {
      throw new NotFoundException('Booking not found');
    }
    return this.toDto(b);
  }

  // ---------- admin ----------

  async findAllForAdmin(q: QueryBookingsDto) {
    await this.releaseExpiredHolds();
    const { page, pageSize, skip, take } = pageParams(q);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.scheduleId) where.scheduleId = q.scheduleId;
    if (q.date) where.travelDate = q.date;
    const [rows, total] = await this.bookings.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginated(rows.map((r) => this.toDto(r, true)), page, pageSize, total);
  }

  async findOneForAdmin(reference: string) {
    await this.releaseExpiredHolds();
    const b = await this.bookings.findOne({ where: { reference } });
    if (!b) throw new NotFoundException('Booking not found');
    return this.toDto(b, true);
  }

  // ---------- passenger details (draft -> reviewed) ----------

  async updatePassenger(reference: string, userId: number, dto: PassengerDetailsDto) {
    await this.releaseExpiredHolds();
    const b = await this.ownBooking(reference, userId);
    if (b.status === BookingStatus.EXPIRED) {
      throw new BadRequestException('The seat hold has expired. Please book again.');
    }
    if (b.status !== BookingStatus.DRAFT && b.status !== BookingStatus.REVIEWED) {
      throw new BadRequestException(
        `Passenger details cannot be changed when the booking is ${b.status}`,
      );
    }
    await this.bookings.update(b.id, {
      passengerName: dto.passengerName,
      passengerEmail: dto.passengerEmail ?? null,
      phoneNumber: dto.phoneNumber,
      identificationNumber: dto.identificationNumber ?? null,
      status: BookingStatus.REVIEWED,
    });
    return this.toDto(await this.loadOrFail(b.id));
  }

  // ---------- cancel ----------

  async cancel(reference: string, actor: Actor) {
    const b = await this.bookings.findOne({ where: { reference } });
    if (!b || (b.userId !== actor.userId && !isAdmin(actor.role))) {
      throw new NotFoundException('Booking not found');
    }
    if (b.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking is already cancelled');
    }
    if (b.status === BookingStatus.EXPIRED) {
      throw new BadRequestException('This booking has already expired');
    }
    const today = todayString();
    const departed =
      b.travelDate < today ||
      (b.travelDate === today && hhmm(b.schedule.departureTime) <= nowTime());
    if (departed) {
      throw new BadRequestException('Cannot cancel a booking after departure time');
    }

    await this.dataSource.transaction(async (m: EntityManager) => {
      await m.update(Booking, { id: b.id }, { status: BookingStatus.CANCELLED });
      await m.update(BookingSeat, { bookingId: b.id }, { active: false });
    });
    return this.toDto(await this.loadOrFail(b.id));
  }

  // ---------- for Part 5 (payments) ----------

  // The booking a payment is for. It must be 'reviewed' and still held.
  // booking.fare is the amount to charge (the server's price, in booking.currency).
  async getForPayment(reference: string, userId: number) {
    await this.releaseExpiredHolds();
    const b = await this.ownBooking(reference, userId);
    if (b.status !== BookingStatus.REVIEWED) {
      throw new BadRequestException(
        `Booking must be 'reviewed' before payment (it is '${b.status}')`,
      );
    }
    return b;
  }

  // Call when the payment succeeded. Safe to call twice.
  async confirmPayment(reference: string) {
    const b = await this.bookings.findOne({ where: { reference } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status === BookingStatus.CONFIRMED) return this.toDto(b);
    if (b.status !== BookingStatus.REVIEWED && b.status !== BookingStatus.PAID) {
      throw new ConflictException(`A '${b.status}' booking cannot be confirmed`);
    }
    await this.bookings.update(b.id, {
      status: BookingStatus.CONFIRMED,
      holdExpiresAt: null,
    });
    return this.toDto(await this.loadOrFail(b.id));
  }

  // ---------- driver ----------

  async getDriverManifest(scheduleId: number, travelDate: string, driverId: number) {
    if (!travelDate || !isValidDate(travelDate)) {
      throw new BadRequestException('travelDate (YYYY-MM-DD) is required');
    }
    const schedule = await this.schedules.findOne({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.vehicle?.driverId !== driverId) {
      throw new ForbiddenException('You are not the driver assigned to this trip');
    }

    const rows = await this.bookings.find({
      where: {
        scheduleId,
        travelDate,
        status: In([BookingStatus.PAID, BookingStatus.CONFIRMED]),
      },
      order: { createdAt: 'ASC' },
    });
    const passengers = rows.map((b) => ({
      reference: b.reference,
      name: b.passengerName ?? b.user?.fullName,
      phoneNumber: b.phoneNumber ?? (b.user as any)?.phoneNumber ?? null,
      seatNumbers: this.seatList(b),
      boarding: b.originStop.name,
      dropOff: b.destinationStop.name,
    }));
    return {
      scheduleId,
      travelDate,
      passengerCount: passengers.reduce((n, p) => n + p.seatNumbers.length, 0),
      passengers,
    };
  }

  // ---------- helpers ----------

  // A hold that ran out frees its seats. Checked whenever someone looks at bookings.
  private async releaseExpiredHolds() {
    const expired = await this.dataSource
      .createQueryBuilder(Booking, 'b')
      .select('b.id', 'id')
      .where('b.status IN (:...s)', {
        s: [BookingStatus.DRAFT, BookingStatus.REVIEWED],
      })
      .andWhere('b.holdExpiresAt < now()')
      .getRawMany<{ id: number }>();
    if (!expired.length) return;
    const ids = expired.map((r) => r.id);
    await this.dataSource.transaction(async (m: EntityManager) => {
      await m.update(Booking, { id: In(ids) }, { status: BookingStatus.EXPIRED });
      await m.update(BookingSeat, { bookingId: In(ids) }, { active: false });
    });
  }

  // A fare set for this pair of stops, in either direction
  private async findFare(routeId: number, a: number, b: number) {
    const repo = this.dataSource.getRepository(Fare);
    return (
      (await repo.findOne({ where: { routeId, originStopId: a, destinationStopId: b } })) ??
      (await repo.findOne({ where: { routeId, originStopId: b, destinationStopId: a } }))
    );
  }

  private async ownBooking(reference: string, userId: number) {
    const b = await this.bookings.findOne({ where: { reference } });
    if (!b || b.userId !== userId) throw new NotFoundException('Booking not found');
    return b;
  }

  private async loadOrFail(id: number) {
    const b = await this.bookings.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  private seatList(b: Booking) {
    return (b.seats ?? []).map((s) => Number(s.seatNumber)).sort((x, y) => x - y);
  }

  // The one reply shape for a booking
  toDto(b: Booking, withUser = false) {
    return {
      id: b.id,
      reference: b.reference,
      status: b.status,
      scheduleId: b.scheduleId,
      travelDate: b.travelDate,
      departureTime: hhmm(b.schedule.departureTime),
      route: { id: b.schedule.routeId, name: b.schedule.route?.name },
      originStop: { id: b.originStop.id, name: b.originStop.name },
      destinationStop: { id: b.destinationStop.id, name: b.destinationStop.name },
      seatNumbers: this.seatList(b),
      totalFare: Number(b.fare),
      currency: b.currency,
      holdExpiresAt: b.holdExpiresAt,
      passenger: b.passengerName
        ? {
            name: b.passengerName,
            email: b.passengerEmail,
            phoneNumber: b.phoneNumber,
            identificationNumber: b.identificationNumber,
          }
        : null,
      ...(withUser
        ? { user: { id: b.userId, name: b.user?.fullName, email: b.user?.email } }
        : {}),
      createdAt: b.createdAt,
    };
  }
}