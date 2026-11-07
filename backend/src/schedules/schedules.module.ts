import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Schedule } from './entities/schedule.entity';
import { Route } from '../routes/entities/route.entity';
import { Vehicle } from '../transport/entities/vehicle.entity';
import { Stop } from '../stops/entities/stop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Route, Vehicle, Stop])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService, TypeOrmModule],
})
export class SchedulesModule {}