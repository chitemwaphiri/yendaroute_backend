import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class QuerySchedulesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt()
  routeId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Boarding stop ID' })
  @IsOptional() @Type(() => Number) @IsInt()
  originStopId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Alighting stop ID' })
  @IsOptional() @Type(() => Number) @IsInt()
  destinationStopId?: number;

  @ApiPropertyOptional({ example: 'Blantyre', description: 'Boarding stop name (partial match)' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: 'Lilongwe', description: 'Destination stop name (partial match)' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({
    example: '2026-11-10',
    description: 'Travel date (YYYY-MM-DD). Only schedules running that weekday, with available seats.',
  })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}