import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: 1, description: 'The ID of the route' })
  @Type(() => Number) @IsInt()
  routeId: number;

  @ApiProperty({ example: 1, description: 'The ID of the vehicle to be used' })
  @Type(() => Number) @IsInt()
  vehicleId: number;

  @ApiProperty({ example: 1, description: 'The ID of the stop where the journey begins' })
  @Type(() => Number) @IsInt()
  departureStopId: number;

  @ApiProperty({ example: '08:30', description: 'Departure time in HH:mm format' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'departureTime must be HH:mm' })
  departureTime: string;

  @ApiProperty({ example: '12:30', required: false, description: 'Arrival time in HH:mm format' })
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'arrivalAt must be HH:mm' })
  arrivalAt?: string;

  @ApiProperty({ example: 15000, required: false, description: 'Optional schedule-specific fare in MWK' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  fare?: number;

  @ApiProperty({ example: ['MON', 'TUE', 'WED', 'THU', 'FRI'], description: 'Days the schedule operates' })
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  daysOfWeek: string[];
}