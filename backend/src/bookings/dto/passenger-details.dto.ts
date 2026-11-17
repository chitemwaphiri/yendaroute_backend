import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class PassengerDetailsDto {
  @ApiProperty({ example: 'Chikondi Banda' })
  @IsString()
  @MinLength(2)
  passengerName: string;

  @ApiPropertyOptional({ example: 'chikondi@example.mw' })
  @IsOptional()
  @IsEmail()
  passengerEmail?: string;

  @ApiProperty({ example: '+265991234567' })
  @Matches(/^\+?[0-9\s-]{7,20}$/, {
    message: 'phoneNumber must be a valid number with at least 7 digits',
  })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'ID-123456' })
  @IsOptional()
  @IsString()
  identificationNumber?: string;
}