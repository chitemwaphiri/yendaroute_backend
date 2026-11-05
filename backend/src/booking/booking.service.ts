import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Role } from '../users/role.enum';
import { CreateBookingDto } from './dto/create-booking.dto';

export interface Booking {
  id: number;
  userId: number;
  passengerName: string;
  tripId: number;
  travelDate: string;
  seatNumbers: number[];
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

@Injectable()
export class BookingService {
  private bookings: Booking[] = [];
  private nextId = 1;

  // Temporary capacity until trips store their own seat count
  private readonly testTripCapacity = 50;

  constructor(private readonly users: UsersService) {}

  private assertDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('Travel date must be in YYYY-MM-DD format');
    }
  }

  private confirmed(tripId: number, travelDate: string) {
    return this.bookings.filter(
      (b) =>
        b.tripId === tripId &&
        b.travelDate === travelDate &&
        b.status === 'CONFIRMED',
    );
  }

  private takenSeats(tripId: number, travelDate: string): number[] {
    return this.confirmed(tripId, travelDate).flatMap((b) => b.seatNumbers);
  }

  async create(user: AuthUser, dto: CreateBookingDto) {
    this.assertDate(dto.travelDate);
    if (dto.travelDate < new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Travel date cannot be in the past');
    }
    const outOfRange = dto.seatNumbers.filter(
      (s) => s < 1 || s > this.testTripCapacity,
    );
    if (outOfRange.length) {
      throw new BadRequestException(
        `Seat numbers must be between 1 and ${this.testTripCapacity}`,
      );
    }

    const account = await this.users.findById(user.id);

    // No await below this line, so two requests cannot take the same seat
    const taken = new Set(this.takenSeats(dto.tripId, dto.travelDate));
    const clash = dto.seatNumbers.filter((s) => taken.has(s));
    if (clash.length) {
      throw new ConflictException(`Seats already booked: ${clash.join(', ')}`);
    }

    const booking: Booking = {
      id: this.nextId++,
      userId: user.id,
      passengerName: account?.fullName ?? user.email,
      tripId: dto.tripId,
      travelDate: dto.travelDate,
      seatNumbers: [...dto.seatNumbers].sort((a, b) => a - b),
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };
    this.bookings.push(booking);
    return { message: 'Booking created successfully', booking };
  }

  // Admins see every booking, passengers see only their own
  findAll(user: AuthUser) {
    if (user.role === Role.ADMIN) return this.bookings;
    return this.bookings.filter((b) => b.userId === user.id);
  }

  findOne(user: AuthUser, id: number) {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking || (user.role !== Role.ADMIN && booking.userId !== user.id)) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  cancel(user: AuthUser, id: number) {
    const booking = this.findOne(user, id);
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }
    booking.status = 'CANCELLED';
    return { message: 'Booking cancelled successfully', booking };
  }

  // Which seats are free on a trip, for the seat picker
  checkAvailability(tripId: number, travelDate: string) {
    this.assertDate(travelDate);
    const taken = this.takenSeats(tripId, travelDate).sort((a, b) => a - b);
    const takenSet = new Set(taken);
    const available: number[] = [];
    for (let s = 1; s <= this.testTripCapacity; s++) {
      if (!takenSet.has(s)) available.push(s);
    }
    return {
      tripId,
      travelDate,
      totalSeats: this.testTripCapacity,
      takenSeats: taken,
      availableSeats: available,
    };
  }

  // Passenger counts for every trip on a date (admins only)
  passengersByTrip(travelDate: string) {
    this.assertDate(travelDate);
    const trips = new Map<number, Booking[]>();
    for (const b of this.bookings) {
      if (b.travelDate === travelDate && b.status === 'CONFIRMED') {
        trips.set(b.tripId, [...(trips.get(b.tripId) ?? []), b]);
      }
    }
    return [...trips.entries()].map(([tripId, list]) => {
      const bookedSeats = list.reduce((n, b) => n + b.seatNumbers.length, 0);
      return {
        tripId,
        travelDate,
        passengerCount: bookedSeats,
        availableSeats: this.testTripCapacity - bookedSeats,
        passengers: list.map((b) => ({
          bookingId: b.id,
          passengerName: b.passengerName,
          seatNumbers: b.seatNumbers,
        })),
      };
    });
  }
}