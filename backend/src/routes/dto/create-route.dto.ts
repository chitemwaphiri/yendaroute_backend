import { IsString, IsOptional, IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RouteStopDto {
  @IsInt()
  stopId: number;

  @IsOptional()
  @IsInt()
  sequence?: number;
}

export class CreateRouteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  originStopId?: number;

  @IsOptional()
  @IsInt()
  destinationStopId?: number;

  @IsOptional()
  @IsInt()
  transportTypeId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops?: RouteStopDto[];
}