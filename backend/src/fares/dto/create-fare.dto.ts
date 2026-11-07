import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFareDto {
  @ApiProperty({ example: 1, description: 'Origin stop ID (must be on the route)' })
  @Type(() => Number) @IsNumber()
  originStopId: number;

  @ApiProperty({ example: 2, description: 'Destination stop ID (must be on the route)' })
  @Type(() => Number) @IsNumber()
  destinationStopId: number;

  @ApiProperty({ example: 15000, description: 'Price amount' })
  @Type(() => Number) @IsNumber() @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'MWK', description: 'Currency (defaults to MWK)' })
  @IsOptional() @IsString()
  currency?: string;
}