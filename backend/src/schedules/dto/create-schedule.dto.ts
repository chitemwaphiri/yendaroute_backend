import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Canonical route ID, when available',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  routeId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Canonical vehicle ID, when available',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Canonical operator ID, when available',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId?: number;

  @ApiProperty({ example: 'Lilongwe' })
  @IsString()
  origin: string;

  @ApiProperty({ example: 'Blantyre' })
  @IsString()
  destination: string;

  @ApiProperty({ example: '2026-11-23T07:00:00Z' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ example: '2026-11-23T12:00:00Z' })
  @IsDateString()
  arrivalTime: string;

  @ApiProperty({ example: 75000, description: 'Fare in MWK' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  fare: number;

  @ApiProperty({ example: 'MWK' })
  @IsIn(['MWK'])
  currency: string;

  @ApiProperty({ example: 42 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(42)
  totalSeats: number;

  @ApiProperty({ example: 'MOVA Express' })
  @IsString()
  operatorName: string;

  @ApiProperty({ example: 'M1' })
  @IsString()
  routeName: string;

  @ApiProperty({ example: 'MOVA 1' })
  @IsString()
  vehicleName: string;

  @ApiProperty({ example: 'Bus' })
  @IsString()
  transportMode: string;
}
