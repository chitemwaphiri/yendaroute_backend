import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class PassengerDetailsDto {
  @ApiProperty({ example: 'Chikondi Banda' })
  @IsString()
  @MinLength(2)
  passengerName: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  passengerEmail: string;

  @ApiProperty({ example: '+265991234567' })
  @Matches(/^\+?[0-9\s-]{7,20}$/, {
    message: 'phoneNumber must be a valid number with at least 7 digits',
  })
  phoneNumber: string;

  @ApiProperty({ example: 'P123456' })
  @IsString()
  identificationNumber: string;
}