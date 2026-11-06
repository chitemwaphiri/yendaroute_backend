import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Matches,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'Schedule id from the schedules dropdown' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  scheduleId: number;

  @ApiProperty({ example: '2026-12-15', description: 'YYYY-MM-DD, on a day the schedule runs' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'travelDate must be in YYYY-MM-DD format',
  })
  travelDate: string;

  @ApiProperty({ example: 1, description: 'Stop id from the stops dropdown' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originStopId: number;

  @ApiProperty({ example: 2, description: 'Stop id from the stops dropdown' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationStopId: number;

  @ApiProperty({ example: [5, 6], type: [Number], description: 'Seat numbers to book' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  seatNumbers: number[];
}