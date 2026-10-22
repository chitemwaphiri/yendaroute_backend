import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Stop } from '../stops/entities/stop.entity';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Schedule } from '../schedules/entities/schedule.entity'; // <-- NEW IMPORT

@Module({
  imports: [TypeOrmModule.forFeature([Stop, Route, RouteStop, Booking, Schedule])], // <-- ADDED HERE
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}