import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouteDto {
  @ApiPropertyOptional({ example: 'Zomba to Mzuzu (Express)' })
  @IsOptional() @IsString() name?: string;

  @ApiPropertyOptional({ example: 450000 })
  @IsOptional() @Type(() => Number) @IsNumber() distance?: number;

  @ApiPropertyOptional({ example: 'YendaRoute Ltd' })
  @IsOptional() @IsString() companyName?: string;

  @ApiPropertyOptional({ example: 'Zomba Main Terminal' })
  @IsOptional() @IsString() pickupLocation?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() featured?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() isActive?: boolean;
}