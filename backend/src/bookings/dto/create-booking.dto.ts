import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  scheduleId: number;

  @IsDateString()
  travelDate: string; // YYYY-MM-DD

  @Type(() => Number)
  @IsInt()
  originStopId: number;

  @Type(() => Number)
  @IsInt()
  destinationStopId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats: number;

  @IsOptional()
  @IsString()
  passengerName?: string;
}
