import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaresService } from './fares.service';
import { FaresController } from './fares.controller';
import { Fare } from './entities/fare.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fare])],
  controllers: [FaresController],
  providers: [FaresService],
  exports: [FaresService, TypeOrmModule],
})
export class FaresModule {}