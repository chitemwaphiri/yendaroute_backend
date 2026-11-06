import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFareDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the stop where the passenger boards',
  })
  @Type(() => Number)
  @IsInt()
  originStopId: number;

  @ApiProperty({
    example: 2,
    description: 'ID of the stop where the passenger gets off',
  })
  @Type(() => Number)
  @IsInt()
  destinationStopId: number;

  @ApiProperty({
    example: 5000,
    description: 'Fare amount between the selected stops',
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: 'MWK',
    description: 'Currency used for the fare',
    default: 'MWK',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}