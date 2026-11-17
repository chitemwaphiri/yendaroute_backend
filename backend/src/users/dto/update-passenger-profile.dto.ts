import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePassengerProfileDto {
  @ApiProperty({ example: 'Chikondi Banda' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'chikondi@mail.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '0999123456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'NID123456' })
  @IsOptional()
  @IsString()
  identificationNumber?: string;
}