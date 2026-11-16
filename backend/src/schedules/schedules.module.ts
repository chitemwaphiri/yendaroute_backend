import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Schedule } from './entities/schedule.entity';
import { Route } from '../routes/entities/route.entity';
import { Vehicle } from '../transport/entities/vehicle.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Fare } from '../fares/entities/fare.entity';
import { AdminSchedulesController } from './admin-schedules.controller';
import { FaresModule } from '../fares/fares.module';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Route, Vehicle, Stop, Booking, Fare]), FaresModule],
  controllers: [SchedulesController, AdminSchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService, TypeOrmModule],
})
export class SchedulesModule {}