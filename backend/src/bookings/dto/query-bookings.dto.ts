import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { BookingStatus } from '../entities/booking.entity';

export class QueryBookingsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Filter bookings by status',
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter bookings by schedule ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  scheduleId?: number;

  @ApiPropertyOptional({
    example: '2026-12-25',
    description: 'Filter bookings by travel date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
