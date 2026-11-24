import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouteDto {
  @ApiPropertyOptional({ example: 'Zomba to Mzuzu (Express)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Blantyre',
    description: 'Origin stop name (resolved to stop ID)',
  })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({
    example: 'Lilongwe',
    description: 'Destination stop name (resolved to stop ID)',
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({
    example: ['Dedza'],
    description: 'Intermediate stop names',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intermediateStops?: string[];

  @ApiPropertyOptional({
    example: 1,
    description: 'Canonical integer ID of the origin stop',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originStopId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Canonical integer ID of the destination stop',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationStopId?: number;

  @ApiPropertyOptional({
    example: [3],
    description: 'Intermediate stop IDs in travel order',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  intermediateStopIds?: number[];

  @ApiPropertyOptional({
    example: 312.5,
    description: 'Distance in kilometers',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  distance?: number;

  @ApiPropertyOptional({ example: 'YendaRoute Ltd' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Zomba Main Terminal' })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'M1' })
  @IsOptional()
  @IsString()
  roadName?: string;
  @ApiPropertyOptional({ example: 'Wenela Bus Depot' })
  @IsOptional()
  @IsString()
  dropOffLocation?: string;
  @ApiPropertyOptional({ example: ['07:00', '14:00'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departureTimes?: string[];
  @ApiPropertyOptional({ example: '4h 30m' })
  @IsOptional()
  @IsString()
  duration?: string;
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transfers?: number;
}
