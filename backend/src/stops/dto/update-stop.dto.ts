import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateStopDto } from './create-stop.dto';

export class UpdateStopDto extends PartialType(CreateStopDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}