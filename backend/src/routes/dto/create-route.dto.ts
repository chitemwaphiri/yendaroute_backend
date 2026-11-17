import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ example: 'Zomba to Mzuzu Express' })
  @IsString() name: string;

  @ApiProperty({ example: 1, description: 'ID of the starting stop' })
  @Type(() => Number) @IsInt() originStopId: number;

  @ApiProperty({ example: 5, description: 'ID of the ending stop' })
  @Type(() => Number) @IsInt() destinationStopId: number;

  @ApiPropertyOptional({ example: [2, 3, 4], description: 'Array of in-between stop IDs in order' })
  @IsOptional() @IsArray() intermediateStopIds?: number[];

  @ApiPropertyOptional({ example: 450000, description: 'Optional distance in meters' })
  @IsOptional() @Type(() => Number) @IsNumber() distance?: number;

  @ApiPropertyOptional({ example: 'YendaRoute Ltd' })
  @IsOptional() @IsString() companyName?: string;

  @ApiPropertyOptional({ example: 'Zomba Main Terminal' })
  @IsOptional() @IsString() pickupLocation?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() featured?: boolean;
}