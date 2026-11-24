import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 'TRIP001',
    description: 'Schedule ID as a string, either numeric or TRIP-prefixed',
  })
  @IsString()
  @Matches(/^(?:TRIP)?0*[1-9]\d*$/i, {
    message: 'tripId must be a numeric ID or a TRIP-prefixed numeric ID',
  })
  tripId: string;

  @ApiProperty({ example: [1, 2], description: 'Seat numbers to reserve (maximum 5)', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(42, { each: true })
  selectedSeats: number[];
}