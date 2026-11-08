import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Chikondi Banda' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'chikondi@mail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '0999123456' })
  @IsOptional()
  @IsString()
  phone?: string;
}