import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FaresController } from './fares.controller';
import { FaresService } from './fares.service';
import { Fare } from './entities/fare.entity';
import { Route } from '../routes/entities/route.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fare, Route]),
  ],
  controllers: [FaresController],
  providers: [FaresService],
  exports: [FaresService],
})
export class FaresModule {}