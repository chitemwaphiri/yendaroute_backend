import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRouteDto } from './create-route.dto';

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Stop IDs to append between the route's origin and destination.
   * Existing intermediate stops are retained and duplicate IDs are ignored.
   */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  intermediateStopIds?: number[];
}
