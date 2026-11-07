import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaresService } from './fares.service';
import { FaresController } from './fares.controller';
import { Fare } from './entities/fare.entity';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fare, Route, RouteStop])],
  controllers: [FaresController],
  providers: [FaresService],
})
export class FaresModule {}