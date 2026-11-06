import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { RoutesModule } from '../routes/routes.module';
import { StopsModule } from '../stops/stops.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [RoutesModule, StopsModule, SchedulesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}