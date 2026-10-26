import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Schedule } from './entities/schedule.entity';
import { Booking } from '../bookings/entities/booking.entity'; // Add this

@Module({
  // Add Booking here
  imports: [TypeOrmModule.forFeature([Schedule, Booking])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService, TypeOrmModule],
})
export class SchedulesModule {}