import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Schedule } from '../schedules/entities/schedule.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
  ) {}

  async create(userId: number, dto: CreateBookingDto) {
    const existing = await this.bookings.findOne({
      where: { scheduleId: dto.scheduleId, travelDate: dto.travelDate, seatNumber: dto.seatNumber, status: BookingStatus.CONFIRMED }
    });
    if (existing) throw new BadRequestException(`Seat ${dto.seatNumber} is already booked`);

    const reference = `BKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return this.bookings.save(this.bookings.create({ ...dto, userId, reference, status: BookingStatus.CONFIRMED }));
  }

  async findMyBookings(userId: number) {
    return this.bookings.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async cancelBooking(id: number, userId: number) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new BadRequestException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('You can only cancel your own bookings');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Booking is already cancelled');

    booking.status = BookingStatus.CANCELLED;
    return this.bookings.save(booking);
  }

  // 👇 NEW: DRIVER MANIFEST ENDPOINT LOGIC 👇
  async getDriverManifest(scheduleId: number, travelDate: string, driverId: number) {
    // 1. Verify schedule exists and is assigned to this driver
    const schedule = await this.schedules.findOne({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    
    if (schedule.vehicle.driverId !== driverId) {
      throw new ForbiddenException('You are not the assigned driver for this schedule');
    }

    // 2. Fetch all confirmed bookings for this schedule and date
    const bookings = await this.bookings.find({
      where: { scheduleId, travelDate, status: BookingStatus.CONFIRMED },
      order: { seatNumber: 'ASC' },
    });

    // 3. Format the list exactly as requested (Name, Pickup, Drop-off)
    return bookings.map(b => ({
      passengerName: b.user.fullName,
      seatNumber: b.seatNumber,
      pickupStop: b.originStop.name,
      dropOffStop: b.destinationStop.name,
      bookingReference: b.reference
    }));
  }
}
