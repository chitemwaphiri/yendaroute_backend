import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStopDto {
  @ApiProperty({ example: 'Lilongwe Old Town' })
  @IsString() name: string;

  @ApiProperty({ example: -13.9626 })
  @Type(() => Number) @IsNumber() latitude: number;

  @ApiProperty({ example: 33.7741 })
  @Type(() => Number) @IsNumber() longitude: number;

  @ApiPropertyOptional({ example: 'Main terminal' })
  @IsOptional() @IsString() description?: string;
}