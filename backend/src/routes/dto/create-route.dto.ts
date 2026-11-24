import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ example: 'Lilongwe - Blantyre' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 1,
    description: 'Canonical integer ID of the origin stop',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originStopId: number;

  @ApiProperty({
    example: 2,
    description: 'Canonical integer ID of the destination stop',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationStopId: number;

  // Frontend sends stop names as strings (e.g. "blantyre", "lilongwe")
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
    description: 'Intermediate stop names in travel order',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intermediateStops?: string[];

  @ApiProperty({
    example: [3],
    description: 'Intermediate stop IDs in travel order',
    type: [Number],
  })
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  intermediateStopIds: number[];

  @ApiPropertyOptional({
    example: 312.5,
    description: 'Distance in kilometers when available from route planning.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiProperty({ example: 'MOVA Express' })
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'Lilongwe Bus Depot' })
  @IsString()
  pickupLocation: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  featured: boolean;

  @ApiProperty({ example: 'M1' }) @IsString() roadName: string;
  @ApiProperty({ example: 'Wenela Bus Depot' })
  @IsString()
  dropOffLocation: string;
  @ApiProperty({ example: ['07:00', '14:00'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  departureTimes: string[];
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
  @ApiProperty({ example: true }) @IsBoolean() isActive: boolean;
}
