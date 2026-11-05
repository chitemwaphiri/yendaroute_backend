import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'Trip id from the trips dropdown' })
  @IsInt()
  @Min(1)
  tripId: number;

  @ApiProperty({ example: [5, 6], type: [Number], description: 'Seat numbers' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  seatNumbers: number[];
}