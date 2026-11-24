import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Query DTOs for lists should extend this to accept the common page/limit convention.
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

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Reads the canonical limit or legacy pageSize and gives skip/take for the database query.
export function pageParams(
  q: {
    page?: number | string;
    pageSize?: number | string;
    limit?: number | string;
  },
  defaultSize = 20,
  maxSize = 100,
) {
  const page = Math.max(1, Number(q.page ?? 1) || 1);
  const limit = Math.min(
    maxSize,
    Math.max(1, Number(q.limit ?? q.pageSize ?? defaultSize) || defaultSize),
  );
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): Paginated<T> {
  return {
    data: items,
    pagination: { page, limit, total },
  };
}
