import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportService } from './transport.service';
import { TransportController } from './transport.controller';
import { Vehicle } from './entities/vehicle.entity';
import { User } from '../auth/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, User, Schedule, Fare, Booking])],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService, TypeOrmModule],
})
export class TransportModule {}