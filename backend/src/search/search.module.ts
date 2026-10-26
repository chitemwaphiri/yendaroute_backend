import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Route } from '../routes/entities/route.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Route, Stop, Schedule, Fare])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}