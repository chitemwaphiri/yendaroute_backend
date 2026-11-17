import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'The refreshToken from login or register' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}