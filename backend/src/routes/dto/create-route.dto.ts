import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ example: 'Zomba to Mzuzu Express' })
  @IsString() name: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number) @IsInt() originStopId: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number) @IsInt() destinationStopId: number;

  @ApiPropertyOptional({ example: [2, 3, 4] })
  @IsOptional() @IsArray() intermediateStopIds?: number[];

  @ApiPropertyOptional({ example: { type: 'LineString', coordinates: [[35.3, -15.3], [34.0, -11.4]] } })
  @IsOptional() @IsObject() geometry?: any;

  @ApiPropertyOptional({ example: 450000 })
  @IsOptional() @Type(() => Number) @IsNumber() distance?: number;
}