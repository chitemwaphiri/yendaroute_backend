import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsString, Matches } from 'class-validator';

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

  @ApiProperty({ example: ['MON', 'TUE', 'WED', 'THU', 'FRI'], description: 'Days the schedule operates' })
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  daysOfWeek: string[];
}