import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'MOVA 1' }) @IsString() name: string;
  @ApiProperty({ example: 'BA 1234' }) @IsString() registrationNumber: string;
  @ApiProperty({ example: 'Bus' }) @IsString() type: string;
  @ApiProperty({ example: 42 }) @Type(() => Number) @IsInt() @Min(1) @Max(42) seatCapacity: number;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}