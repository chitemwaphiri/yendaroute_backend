import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'The ID of the schedule you are booking' })
  @Type(() => Number) @IsInt()
  scheduleId: number;

  @ApiProperty({ example: '2026-12-25', description: 'Travel date in YYYY-MM-DD format' })
  @IsDateString()
  travelDate: string;

  @ApiProperty({ example: '1A', description: 'The specific seat number (e.g. 1A, 2B)' })
  @IsString()
  seatNumber: string;

  @ApiProperty({ example: 1, description: 'Pickup stop ID' })
  @Type(() => Number) @IsInt()
  originStopId: number;

  @ApiProperty({ example: 2, description: 'Drop-off stop ID' })
  @Type(() => Number) @IsInt()
  destinationStopId: number;

  @ApiProperty({ example: 15000, description: 'Calculated fare for the trip' })
  @Type(() => Number) @IsNumber()
  fare: number;
}