import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportService } from './transport.service';
import { TransportController } from './transport.controller';
import { TransportType } from './entities/transport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransportType])],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService, TypeOrmModule],
})
export class TransportModule {}