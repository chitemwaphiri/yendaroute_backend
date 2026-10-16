import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

export interface Booking {
  id: number;
  passengerName: string;
  phoneNumber: string;
  tripId: number;
  travelDate: string;
  seatsBooked: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

@Injectable()
export class BookingService {
  private bookings: Booking[] = [];
  private nextId = 1;

  // Temporary capacity for testing
  private readonly testTripCapacity = 50;

  create(data: {
    passengerName: string;
    phoneNumber: string;
    tripId: number;
    travelDate: string;
    seatsBooked: number;
  }) {
    if (
      !data.passengerName ||
      !data.phoneNumber ||
      !data.travelDate ||
      !Number.isInteger(data.tripId) ||
      data.tripId <= 0 ||
      !Number.isInteger(data.seatsBooked) ||
      data.seatsBooked <= 0
    ) {
      throw new BadRequestException('Invalid booking information');
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.travelDate) ||
      Number.isNaN(Date.parse(data.travelDate))
    ) {
      throw new BadRequestException(
        'Travel date must be in YYYY-MM-DD format',
      );
    }

    const bookedSeats = this.bookings
      .filter(
        (booking) =>
          booking.tripId === data.tripId &&
          booking.travelDate === data.travelDate &&
          booking.status === 'CONFIRMED',
      )
      .reduce((total, booking) => total + booking.seatsBooked, 0);

    const availableSeats = this.testTripCapacity - bookedSeats;

    if (data.seatsBooked > availableSeats) {
      throw new BadRequestException(
        `Only ${availableSeats} seats are available`,
      );
    }

    const booking: Booking = {
      id: this.nextId++,
      passengerName: data.passengerName,
      phoneNumber: data.phoneNumber,
      tripId: data.tripId,
      travelDate: data.travelDate,
      seatsBooked: data.seatsBooked,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    this.bookings.push(booking);

    return {
      message: 'Booking created successfully',
      booking,
    };
  }

  findAll() {
    return this.bookings;
  }

  findOne(id: number) {
    const booking = this.bookings.find((item) => item.id === id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  checkAvailability(tripId: number, travelDate: string) {
    const bookedSeats = this.bookings
      .filter(
        (booking) =>
          booking.tripId === tripId &&
          booking.travelDate === travelDate &&
          booking.status === 'CONFIRMED',
      )
      .reduce((total, booking) => total + booking.seatsBooked, 0);

    return {
      tripId,
      travelDate,
      totalSeats: this.testTripCapacity,
      bookedSeats,
      availableSeats: this.testTripCapacity - bookedSeats,
    };
  }

  cancel(id: number) {
    const booking = this.findOne(id);

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    booking.status = 'CANCELLED';

    return {
      message: 'Booking cancelled successfully',
      booking,
    };
  }
}