import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: 'john@example.mw', 
    description: 'The email address used during registration' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'Password123', 
    description: 'The account password' 
  })
  @IsString()
  password: string;
}