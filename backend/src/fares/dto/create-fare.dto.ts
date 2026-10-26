import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFareDto {
  @Type(() => Number)
  @IsNumber()
  routeId: number;

  @Type(() => Number)
  @IsNumber()
  originStopId: number;

  @Type(() => Number)
  @IsNumber()
  destinationStopId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}