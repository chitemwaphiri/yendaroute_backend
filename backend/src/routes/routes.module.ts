import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [TypeOrmModule.forFeature([Route, RouteStop]), SchedulesModule],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService, TypeOrmModule],
})
export class RoutesModule {}