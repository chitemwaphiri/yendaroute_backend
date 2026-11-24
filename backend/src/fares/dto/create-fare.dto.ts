import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Min } from 'class-validator';

export class CreateFareDto {
  @ApiProperty({ example: 1, description: 'Origin stop ID (must be on the route)' })
  @Type(() => Number) @IsInt() @Min(1)
  originStopId: number;

  @ApiProperty({ example: 2, description: 'Destination stop ID (must be on the route)' })
  @Type(() => Number) @IsInt() @Min(1)
  destinationStopId: number;

  @ApiProperty({ example: 75000, description: 'Fare amount in MWK' })
  @Type(() => Number) @IsNumber() @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'MWK', enum: ['MWK'] })
  @IsIn(['MWK'])
  currency: string;
}