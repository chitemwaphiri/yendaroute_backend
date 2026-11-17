import { IsOptional, IsString } from 'class-validator';

export class RequestRoleDto {
  @IsOptional()
  @IsString()
  reason?: string; // For Admin requests

  @IsOptional()
  @IsString()
  licenseId?: string; // For Driver requests
}
