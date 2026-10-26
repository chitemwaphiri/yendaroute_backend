import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTransportTypeDto } from './create-transport-type.dto';

export class UpdateTransportTypeDto extends PartialType(CreateTransportTypeDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}