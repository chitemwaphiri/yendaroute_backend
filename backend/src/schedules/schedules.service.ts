import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
// Import Booking entity and status enum to calculate availability
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

@Injectable()
export class SchedulesService {
  constructor(@InjectRepository(Schedule) private schedules: Repository<Schedule>) {}

  async create(dto: CreateScheduleDto) {
    // Enforce SRS 2.4.9: No identical departureTime on the same route
    const existing = await this.schedules.findOne({
      where: {
        routeId: dto.routeId,
        departureTime: dto.departureTime,
      },
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
    await this.schedules.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const schedule = await this.findOne(id);
    await this.schedules.remove(schedule);
    return { deleted: true, id };
  }

  // Updated: Calculate actual availability using the bookings table
  async getAvailability(id: number, travelDate: string) {
    const schedule = await this.findOne(id);

    // Calculate how many seats are already booked for this date
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
}