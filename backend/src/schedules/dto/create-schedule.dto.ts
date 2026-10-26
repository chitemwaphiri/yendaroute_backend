import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @Type(() => Number)
  @IsInt()
  routeId: number;

  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'departureTime must be in HH:mm format',
  })
  departureTime: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  daysOfWeek: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatCapacity: number;

  @IsOptional()
  @IsString()
  vehicleInfo?: string;
}