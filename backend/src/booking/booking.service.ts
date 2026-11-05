import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Role } from '../users/role.enum';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

@Injectable()
export class BookingService {
  constructor(
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(Schedule)
    private readonly schedules: Repository<Schedule>,
    @InjectRepository(Stop)
    private readonly stops: Repository<Stop>,
  ) {}

  private assertDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }
  }

  private view(b: Booking) {
    return {
      id: b.id,
      tripId: b.tripId,
      route: b.trip?.route?.name ?? null,
      departureTime: b.trip?.departureTime ?? null,
      passengerName: b.passengerName,
      seatNumbers: b.seatNumbers,
      status: b.status,
      createdAt: b.createdAt,
    };
  }

  private async getTrip(tripId: number) {
    const trip = await this.schedules.findOne({
      where: { id: tripId, isActive: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private async takenSeats(tripId: number): Promise<number[]> {
    const rows = await this.bookings.find({
      where: { tripId, status: 'CONFIRMED' },
    });
    return rows.flatMap((r) => r.seatNumbers);
  }

  // ---------- Dropdown data ----------

  async tripOptions(date?: string) {
    if (date) this.assertDate(date);
    const where = date
      ? {
          isActive: true,
          departureTime: Between(
            new Date(`${date}T00:00:00`),
            new Date(`${date}T23:59:59`),
          ),
        }
      : { isActive: true };

    const trips = await this.schedules.find({
      where,
      relations: { route: { originStop: true, destinationStop: true } },
      order: { departureTime: 'ASC' },
    });

    const upcoming = trips.filter((t) => t.departureTime.getTime() >= Date.now());
    const ids = upcoming.map((t) => t.id);
    const confirmed = ids.length
      ? await this.bookings.find({
          where: { tripId: In(ids), status: 'CONFIRMED' },
        })
      : [];

    return upcoming.map((t) => {
      const booked = confirmed
        .filter((b) => b.tripId === t.id)
        .reduce((n, b) => n + b.seatNumbers.length, 0);
      return {
        id: t.id,
        label: `${t.route?.name ?? 'Trip'}, ${dateOf(t.departureTime)} ${timeOf(
          t.departureTime,
        )}, MK ${t.price}`,
        route: t.route?.name ?? null,
        from: t.route?.originStop?.name ?? null,
        to: t.route?.destinationStop?.name ?? null,
        departureTime: t.departureTime,
        price: t.price,
        totalSeats: t.totalSeats,
        availableSeats: t.totalSeats - booked,
      };
    });
  }

  async stopOptions() {
    const stops = await this.stops.find({ order: { name: 'ASC' } });
    return stops.map((s) => ({
      id: s.id,
      label: s.city ? `${s.name}, ${s.city}` : s.name,
    }));
  }

  // ---------- Bookings ----------

  async create(user: AuthUser, dto: CreateBookingDto) {
    const account = await this.users.findById(user.id);

    return this.dataSource.transaction(async (manager) => {
      // Lock the trip row so two requests cannot take the same seat
      const trip = await manager.findOne(Schedule, {
        where: { id: dto.tripId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.departureTime.getTime() < Date.now()) {
        throw new BadRequestException('This trip has already departed');
      }
      if (dto.seatNumbers.some((s) => s > trip.totalSeats)) {
        throw new BadRequestException(
          `Seat numbers must be between 1 and ${trip.totalSeats}`,
        );
      }

      const existing = await manager.find(Booking, {
        where: { tripId: trip.id, status: 'CONFIRMED' },
      });
      const taken = new Set(existing.flatMap((b) => b.seatNumbers));
      const clash = dto.seatNumbers.filter((s) => taken.has(s));
      if (clash.length) {
        throw new ConflictException(`Seats already booked: ${clash.join(', ')}`);
      }

      const saved = await manager.save(
        manager.create(Booking, {
          userId: user.id,
          tripId: trip.id,
          passengerName: account?.fullName ?? user.email,
          seatNumbers: [...dto.seatNumbers].sort((a, b) => a - b),
          status: 'CONFIRMED',
        }),
      );

      return {
        message: 'Booking created successfully',
        booking: {
          id: saved.id,
          tripId: saved.tripId,
          departureTime: trip.departureTime,
          passengerName: saved.passengerName,
          seatNumbers: saved.seatNumbers,
          status: saved.status,
          createdAt: saved.createdAt,
        },
      };
    });
  }

  // Admins see every booking, passengers see only their own
  async findAll(user: AuthUser) {
    const rows = await this.bookings.find({
      where: user.role === Role.ADMIN ? {} : { userId: user.id },
      relations: { trip: { route: true } },
      order: { id: 'DESC' },
    });
    return rows.map((b) => this.view(b));
  }

  private async load(user: AuthUser, id: number) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: { trip: { route: true } },
    });
    if (!booking || (user.role !== Role.ADMIN && booking.userId !== user.id)) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async findOne(user: AuthUser, id: number) {
    return this.view(await this.load(user, id));
  }

  async cancel(user: AuthUser, id: number) {
    const booking = await this.load(user, id);
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }
    booking.status = 'CANCELLED';
    await this.bookings.save(booking);
    return {
      message: 'Booking cancelled successfully',
      booking: this.view(booking),
    };
  }

  // Taken and free seats for a trip, for the seat picker
  async checkAvailability(tripId: number) {
    const trip = await this.getTrip(tripId);
    const taken = (await this.takenSeats(trip.id)).sort((a, b) => a - b);
    const takenSet = new Set(taken);
    const available: number[] = [];
    for (let s = 1; s <= trip.totalSeats; s++) {
      if (!takenSet.has(s)) available.push(s);
    }
    return {
      tripId: trip.id,
      departureTime: trip.departureTime,
      totalSeats: trip.totalSeats,
      takenSeats: taken,
      availableSeats: available,
    };
  }

  // Passenger count for each scheduled trip (admins only)
  async passengersByTrip(date?: string) {
    if (date) this.assertDate(date);
    const confirmed = await this.bookings.find({
      where: { status: 'CONFIRMED' },
      relations: { trip: { route: { originStop: true, destinationStop: true } } },
      order: { tripId: 'ASC', id: 'ASC' },
    });

    const byTrip = new Map<number, Booking[]>();
    for (const b of confirmed) {
      if (date && dateOf(b.trip.departureTime) !== date) continue;
      byTrip.set(b.tripId, [...(byTrip.get(b.tripId) ?? []), b]);
    }

    return [...byTrip.values()].map((list) => {
      const t = list[0].trip;
      const booked = list.reduce((n, b) => n + b.seatNumbers.length, 0);
      return {
        tripId: t.id,
        route: t.route?.name ?? null,
        from: t.route?.originStop?.name ?? null,
        to: t.route?.destinationStop?.name ?? null,
        departureTime: t.departureTime,
        passengerCount: booked,
        totalSeats: t.totalSeats,
        availableSeats: t.totalSeats - booked,
        passengers: list.map((b) => ({
          bookingId: b.id,
          passengerName: b.passengerName,
          seatNumbers: b.seatNumbers,
        })),
      };
    });
  }
}