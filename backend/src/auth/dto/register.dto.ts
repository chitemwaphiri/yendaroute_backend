import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john@example.mw', description: 'A unique email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0999111222', description: 'Phone number' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'Password123', description: 'Minimum 6 characters' })
  @IsString()
  @MinLength(6)
  password: string;
}