import { IsOptional, IsString } from 'class-validator';

export class RequestAdminDto {
  @IsOptional()
  @IsString()
  reason?: string;
}