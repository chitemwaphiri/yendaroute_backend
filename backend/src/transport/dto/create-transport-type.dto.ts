import { IsOptional, IsString } from 'class-validator';

export class CreateTransportTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}