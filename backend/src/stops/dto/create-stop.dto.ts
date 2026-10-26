import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStopDto {
  @IsString()
  name: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  description?: string;
}