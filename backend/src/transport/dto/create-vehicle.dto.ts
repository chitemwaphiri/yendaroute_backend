import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'LL-1234' }) @IsString() plateNumber: string;
  @ApiProperty({ example: 'Minibus' }) @IsString() vehicleType: string;
  @ApiProperty({ example: 15 }) @Type(() => Number) @IsInt() @Min(1) capacity: number;
  @ApiPropertyOptional({ example: 'Toyota Hiace' }) @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: 2 }) @IsOptional() @Type(() => Number) @IsInt() driverId?: number;
}