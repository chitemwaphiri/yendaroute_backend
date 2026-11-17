import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Query DTOs for lists should extend this, so page and pageSize are always accepted.
export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Reads page and pageSize and gives skip/take for the database query.
export function pageParams(
  q: { page?: number | string; pageSize?: number | string },
  defaultSize = 20,
  maxSize = 100,
) {
  const page = Math.max(1, Number(q.page ?? 1) || 1);
  const pageSize = Math.min(
    maxSize,
    Math.max(1, Number(q.pageSize ?? defaultSize) || defaultSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): Paginated<T> {
  return { items, page, pageSize, total };
}