import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: 1, description: 'Trip chosen from the dropdown' })
  @IsInt()
  @Min(1)
  tripId: number;

  @ApiProperty({ example: '2026-11-25', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'travelDate must be in YYYY-MM-DD format',
  })
  travelDate: string;

  @ApiProperty({ example: [5, 6], type: [Number], description: 'Seat numbers' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  seatNumbers: number[];
}