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
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../payments/entities/payment.entity';
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
const parseScheduleId = (tripId: string): number | null => {
  const match = /^(?:TRIP)?0*([1-9]\d*)$/i.exec(tripId);
  if (!match) return null;
  const scheduleId = Number(match[1]);
  return Number.isSafeInteger(scheduleId) ? scheduleId : null;
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(BookingSeat) private seats: Repository<BookingSeat>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
    private dataSource: DataSource,
  ) {}

  // ---------- create (draft + seat hold) ----------

  async create(userId: number, dto: CreateBookingDto, idempotencyKey?: string) {
    const scheduleId = parseScheduleId(dto.tripId);
    if (scheduleId === null) {
      throw new BadRequestException(
        'tripId must be a numeric ID or a TRIP-prefixed numeric ID',
      );
    }
    const selectedSeats = dto.selectedSeats;
    if (!selectedSeats?.length) {
      throw new BadRequestException('At least one selected seat is required');
    }
    // Same key from the same user = same booking, never a second one
    if (idempotencyKey) {
      const existing = await this.bookings.findOne({
        where: { userId, idempotencyKey },
      });
      if (existing) return this.toDto(existing);
    }

    await this.releaseExpiredHolds();

    const schedule = await this.schedules.findOne({
      where: { id: scheduleId },
    });
    if (!schedule || !schedule.isActive)
      throw new NotFoundException('Schedule not found');

    const travelDate = schedule.serviceDate ?? todayString();
    if (!isValidDate(travelDate)) {
      throw new BadRequestException('The schedule has an invalid service date');
    }
    const today = todayString();
    if (travelDate < today)
      throw new BadRequestException('Travel date is in the past');
    const day = dayOf(travelDate);
    if (!schedule.daysOfWeek.includes(day)) {
      throw new BadRequestException(`This schedule does not run on ${day}`);
    }
    if (travelDate === today && hhmm(schedule.departureTime) <= nowTime()) {
      throw new BadRequestException('This trip has already departed');
    }

    // Seats must exist in this vehicle
    const capacity = Math.min(
      42,
      Number(schedule.totalSeats ?? schedule.vehicle?.capacity),
    );
    if (!capacity) {
      throw new BadRequestException(
        'This schedule has no seat capacity configured',
      );
    }
    const missing = selectedSeats.filter((n) => n > capacity);
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
    const reversed =
      schedule.departureStopId === found[found.length - 1].stopId;
    const ordered = reversed ? [...found].reverse() : found;

    const originStopId = ordered[0].stopId;
    const destinationStopId = ordered[ordered.length - 1].stopId;
    const from = ordered.findIndex((rs) => rs.stopId === originStopId);
    const to = ordered.findIndex((rs) => rs.stopId === destinationStopId);
    if (from === -1 || to === -1) {
      throw new BadRequestException(
        "Both stops must be on this schedule's route",
      );
    }
    if (from >= to) {
      throw new BadRequestException(
        'The drop-off stop must come after the boarding stop',
      );
    }

    // The price is worked out here, never taken from the app.
    // Part 3's part-journey fare (fareBetween) will replace this lookup.
    const fare = await this.findFare(
      schedule.routeId,
      originStopId,
      destinationStopId,
    );
    if (!fare) {
      throw new BadRequestException(
        'No fare is set for these stops yet, so this trip cannot be booked',
      );
    }
    const total = Number(fare.amount) * selectedSeats.length;

    // Seats already held or sold
    const labels = selectedSeats.map(String);
    const taken = await this.seats.find({
      where: {
        scheduleId: schedule.id,
        travelDate,
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
            travelDate,
            originStopId,
            destinationStopId,
            fare: total,
            currency: fare.currency,
            status: BookingStatus.DRAFT,
            holdExpiresAt: new Date(Date.now() + holdMinutes() * 60_000),
            idempotencyKey: idempotencyKey ?? null,
          }),
        );
        await m.save(
          BookingSeat,
          labels.map((seatNumber) =>
            m.create(BookingSeat, {
              bookingId: booking.id,
              scheduleId: schedule.id,
              travelDate,
              seatNumber: Number(seatNumber),
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
          const again = await this.bookings.findOne({
            where: { userId, idempotencyKey },
          });
          if (again) return this.toDto(again);
        }
        throw new ConflictException(
          'One of those seats was just taken. Please choose again.',
        );
      }
      throw e;
    }
  }

  // ---------- read ----------

  async findMine(userId: number, q: QueryBookingsDto) {
    await this.releaseExpiredHolds();
    const { page, limit, skip, take } = pageParams(q);
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
    return paginated(
      await Promise.all(rows.map((r) => this.toDto(r))),
      page,
      limit,
      total,
    );
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
    const { page, limit, skip, take } = pageParams(q);
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
    return paginated(
      await Promise.all(rows.map((r) => this.toDto(r))),
      page,
      limit,
      total,
    );
  }

  async findOneForAdmin(reference: string) {
    await this.releaseExpiredHolds();
    const b = await this.bookings.findOne({ where: { reference } });
    if (!b) throw new NotFoundException('Booking not found');
    return this.toDto(b);
  }

  // ---------- passenger details (draft -> reviewed) ----------

  async updatePassenger(
    reference: string,
    userId: number,
    dto: PassengerDetailsDto,
  ) {
    await this.releaseExpiredHolds();
    const b = await this.ownBooking(reference, userId);
    if (b.status === BookingStatus.EXPIRED) {
      throw new BadRequestException(
        'The seat hold has expired. Please book again.',
      );
    }
    if (
      b.status !== BookingStatus.DRAFT &&
      b.status !== BookingStatus.REVIEWED
    ) {
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
    if (
      b.status === BookingStatus.PAID ||
      b.status === BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Paid or confirmed bookings cannot be cancelled',
      );
    }
    const today = todayString();
    const departed =
      b.travelDate < today ||
      (b.travelDate === today && hhmm(b.schedule.departureTime) <= nowTime());
    if (departed) {
      throw new BadRequestException(
        'Cannot cancel a booking after departure time',
      );
    }

    await this.dataSource.transaction(async (m: EntityManager) => {
      await m.update(
        Booking,
        { id: b.id },
        { status: BookingStatus.CANCELLED },
      );
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
    if (!b.holdExpiresAt || b.holdExpiresAt.getTime() <= Date.now()) {
      throw new ConflictException('The booking seat hold has expired');
    }
    return b;
  }

  async confirmPayment(reference: string, actor?: Actor) {
    const bookingId = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const repository = manager.getRepository(Booking);
        const booking = await manager
          .createQueryBuilder(Booking, 'booking')
          .setLock('pessimistic_write')
          .where('booking.reference = :reference', { reference })
          .getOne();
        if (!booking) throw new NotFoundException('Booking not found');
        if (
          actor &&
          !isAdmin(actor.role) &&
          (actor.role !== 'passenger' || booking.userId !== actor.userId)
        ) {
          throw new NotFoundException('Booking not found');
        }
        if (booking.status === BookingStatus.CONFIRMED) return booking.id;
        if (booking.status !== BookingStatus.PAID) {
          throw new ConflictException(
            `A '${booking.status}' booking cannot be confirmed before payment`,
          );
        }
        await repository.update(booking.id, {
          status: BookingStatus.CONFIRMED,
          holdExpiresAt: null,
        });
        return booking.id;
      },
    );
    return this.toDto(await this.loadOrFail(bookingId));
  }

  // ---------- driver ----------

  async getDriverManifest(
    scheduleId: number,
    travelDate: string,
    driverId: number,
  ) {
    if (!travelDate || !isValidDate(travelDate)) {
      throw new BadRequestException('travelDate (YYYY-MM-DD) is required');
    }
    const schedule = await this.schedules.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.vehicle?.driverId !== driverId) {
      throw new ForbiddenException(
        'You are not the driver assigned to this trip',
      );
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
      await m.update(
        Booking,
        { id: In(ids) },
        { status: BookingStatus.EXPIRED },
      );
      await m.update(BookingSeat, { bookingId: In(ids) }, { active: false });
    });
  }

  // A fare set for this pair of stops, in either direction
  private async findFare(routeId: number, a: number, b: number) {
    const repo = this.dataSource.getRepository(Fare);
    return (
      (await repo.findOne({
        where: { routeId, originStopId: a, destinationStopId: b },
      })) ??
      (await repo.findOne({
        where: { routeId, originStopId: b, destinationStopId: a },
      }))
    );
  }

  private async ownBooking(reference: string, userId: number) {
    const b = await this.bookings.findOne({ where: { reference } });
    if (!b || b.userId !== userId)
      throw new NotFoundException('Booking not found');
    return b;
  }

  private async loadOrFail(id: number) {
    const b = await this.bookings.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  private seatList(b: Booking) {
    return (b.seats ?? [])
      .map((s) => Number(s.seatNumber))
      .sort((x, y) => x - y);
  }

  async toDto(b: Booking) {
    const selectedSeats = this.seatList(b);
    const schedule = b.schedule;
    const payment = await this.payments.findOne({
      where: { bookingId: b.id, status: PaymentStatus.SUCCESSFUL },
      order: { createdAt: 'DESC' },
    });
    const scheduleBookings = schedule
      ? await this.bookings.find({
          where: {
            scheduleId: b.scheduleId,
            travelDate: b.travelDate,
            status: In([
              BookingStatus.DRAFT,
              BookingStatus.REVIEWED,
              BookingStatus.PAID,
              BookingStatus.CONFIRMED,
            ]),
          },
        })
      : [];
    const now = Date.now();
    const bookedSeats = [
      ...new Set(
        scheduleBookings.flatMap((booking) => {
          const liveHold =
            booking.status !== BookingStatus.DRAFT &&
            booking.status !== BookingStatus.REVIEWED
              ? true
              : !!booking.holdExpiresAt &&
                booking.holdExpiresAt.getTime() > now;
          return liveHold
            ? (booking.seats ?? [])
                .filter((seat) => seat.active)
                .map((seat) => Number(seat.seatNumber))
            : [];
        }),
      ),
    ].sort((a, b) => a - b);
    const capacity = Math.min(
      42,
      Number(schedule?.totalSeats ?? schedule?.vehicle?.capacity ?? 42),
    );
    const paymentMethod =
      payment?.method === PaymentMethod.BANK_CARD
        ? 'Card'
        : payment
          ? 'MobileMoney'
          : null;
    const passenger = b.passengerName
      ? {
          name: b.passengerName,
          email: b.passengerEmail,
          phone: b.phoneNumber,
          identificationNumber: b.identificationNumber,
        }
      : null;
    return {
      id: String(b.id),
      reference: b.reference,
      tripId: String(b.scheduleId),
      status:
        b.status === BookingStatus.EXPIRED ? BookingStatus.CANCELLED : b.status,
      schedule: schedule
        ? {
            id: String(schedule.id),
            origin: b.originStop?.name ?? null,
            destination: b.destinationStop?.name ?? null,
            departureTime: `${b.travelDate}T${hhmm(schedule.departureTime)}:00Z`,
            arrivalTime: schedule.arrivalAt
              ? `${schedule.arrivalDate ?? b.travelDate}T${hhmm(schedule.arrivalAt)}:00Z`
              : null,
            fare: Number(b.fare) / selectedSeats.length,
            currency: b.currency,
            totalSeats: capacity,
            bookedSeats,
            routeName: schedule.route?.roadName ?? schedule.route?.name ?? null,
            operatorName:
              schedule.operatorName ?? schedule.route?.companyName ?? null,
            vehicleName:
              schedule.vehicleName ??
              schedule.vehicle?.name ??
              schedule.vehicle?.plateNumber ??
              null,
            transportMode:
              schedule.transportMode ?? schedule.vehicle?.vehicleType ?? null,
          }
        : null,
      selectedSeats,
      passenger,
      passengerName: b.passengerName,
      passengerEmail: b.passengerEmail,
      phoneNumber: b.phoneNumber,
      identificationNumber: b.identificationNumber,
      paymentMethod,
      paymentReference: payment?.transactionReference ?? null,
      payment: payment
        ? {
            method: paymentMethod,
            reference: payment.transactionReference,
            amount: Number(payment.amount),
            currency: payment.currency,
            status: 'paid',
            paidAt: payment.paidAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
