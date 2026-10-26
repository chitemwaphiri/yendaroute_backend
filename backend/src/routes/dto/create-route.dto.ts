import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRouteDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsInt()
  originStopId: number;

  @Type(() => Number)
  @IsInt()
  destinationStopId: number;

  @Type(() => Number)
  @IsInt()
  transportTypeId: number;

  @IsOptional()
  @IsString()
  description?: string;
}