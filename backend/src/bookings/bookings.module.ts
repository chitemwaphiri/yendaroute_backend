import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Schedule, Fare])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService, TypeOrmModule],
})
export class BookingsModule {}
