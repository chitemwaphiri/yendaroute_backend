import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Stop } from '../stops/entities/stop.entity';
import { Route } from '../routes/entities/route.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Booking } from '../booking/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stop, Route, Schedule, Booking])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}