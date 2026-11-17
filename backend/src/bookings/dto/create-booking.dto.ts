import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'The schedule (trip) to book' })
  @Type(() => Number)
  @IsInt()
  scheduleId: number;

  @ApiProperty({ example: '2026-12-25', description: 'Travel date, YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'travelDate must be YYYY-MM-DD' })
  travelDate: string;

  @ApiProperty({ example: [3, 4], description: 'Seat numbers, from 1 up to the vehicle capacity' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  seatNumbers: number[];

  @ApiPropertyOptional({ example: 1, description: 'Boarding stop. Defaults to the first stop of the route' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  originStopId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Drop-off stop. Defaults to the last stop of the route' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  destinationStopId?: number;
}