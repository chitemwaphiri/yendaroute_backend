import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { User, UserRole } from '../auth/entities/user.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    private dataSource: DataSource,
  ) {}

  async create(userId: number, dto: CreateBookingDto) {
    // 1. Validate schedule
    const schedule = await this.schedules.findOne({ where: { id: dto.scheduleId } });
    if (!schedule || !schedule.isActive) throw new NotFoundException('Schedule not found or inactive');

    // 2. Validate date
    const travelDate = new Date(dto.travelDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDate < today) throw new BadRequestException('Travel date cannot be in the past');

    // 3. Validate seat availability
    const bookedSeats = await this.bookings
      .createQueryBuilder('b')
      .select('SUM(b.seats)', 'total')
      .where('b.scheduleId = :scheduleId', { scheduleId: dto.scheduleId })
      .andWhere('b.travelDate = :travelDate', { travelDate: dto.travelDate })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .getRawOne();

    const currentBooked = Number(bookedSeats?.total) || 0;
    if (currentBooked + dto.seats > schedule.seatCapacity) {
      throw new BadRequestException(`Only ${schedule.seatCapacity - currentBooked} seats available`);
    }

    // 4. Calculate fare (if available)
    const fare = await this.fares.findOne({
      where: { originStopId: dto.originStopId, destinationStopId: dto.destinationStopId },
    });
    const estimatedFare = fare ? fare.amount : 0;

    // 5. Create booking
    const reference = `BKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const booking = this.bookings.create({
      ...dto,
      userId,
      reference,
      estimatedFare,
      status: BookingStatus.CONFIRMED,
    });

    return this.bookings.save(booking);
  }

  async findAll(user: any, status?: string) {
    const where: any = {};
    
    // Admin sees all, passenger sees only their own
    if (user.role !== UserRole.ADMIN) {
      where.userId = user.userId;
    }
    
    if (status) where.status = status;

    return this.bookings.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, user: any) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    // Prevent passengers from seeing other passengers' bookings
    if (user.role !== UserRole.ADMIN && booking.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return booking;
  }

  async cancel(id: number, user: any) {
    const booking = await this.findOne(id, user); // Reuses ownership check

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Check if departure has passed
    const schedule = booking.schedule;
    const now = new Date();
    const travel = new Date(booking.travelDate);
    const [hours, minutes] = schedule.departureTime.split(':');
    travel.setHours(Number(hours), Number(minutes), 0, 0);

    if (now > travel) {
      throw new BadRequestException('Cannot cancel a booking after departure time');
    }

    booking.status = BookingStatus.CANCELLED;
    return this.bookings.save(booking);
  }
}