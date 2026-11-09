import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { QueryRouteDto } from './query-route.dto';

export class SearchRouteDto extends QueryRouteDto {
  @ApiPropertyOptional({ example: 1, description: 'Route serves this boarding stop' })
  @IsOptional() @Type(() => Number) @IsInt()
  originStopId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Route serves this stop after the origin' })
  @IsOptional() @Type(() => Number) @IsInt()
  destinationStopId?: number;

  @ApiPropertyOptional({ example: 'Blantyre', description: 'Boarding stop name (partial match)' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: 'Lilongwe', description: 'Destination stop name (partial match)' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ example: -15.7861, description: 'Passenger latitude (use with lng)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 35.0058, description: 'Passenger longitude (use with lat)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Search radius in metres (default 1000)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(50000)
  radius?: number;
}