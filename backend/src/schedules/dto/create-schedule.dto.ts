import { IsInt, IsDateString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  routeId: number;

  @IsDateString()
  departureTime: string;

  @IsDateString()
  arrivalTime: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}