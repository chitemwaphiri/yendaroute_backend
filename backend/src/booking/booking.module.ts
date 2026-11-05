import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { UsersModule } from '../users/users.module';
import { Booking } from './entities/booking.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Stop } from '../stops/entities/stop.entity';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Booking, Schedule, Stop])],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}