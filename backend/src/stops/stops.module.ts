import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StopsService } from './stops.service';
import { StopsController } from './stops.controller';
import { Stop } from './entities/stop.entity';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Stop]), RoutesModule],
  controllers: [StopsController],
  providers: [StopsService],
  exports: [StopsService, TypeOrmModule],
})
export class StopsModule {}