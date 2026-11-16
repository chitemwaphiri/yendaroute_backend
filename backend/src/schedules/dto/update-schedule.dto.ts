import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  fare?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}