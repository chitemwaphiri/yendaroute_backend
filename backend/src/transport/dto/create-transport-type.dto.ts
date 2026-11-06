import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTransportTypeDto {
  @ApiProperty({ example: 'Minibus', description: 'Transport type name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '14-seater minibus for city routes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'BL 1234', description: 'Vehicle plate number (unique)' })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ example: 14, minimum: 1, description: 'Number of passenger seats' })
  @IsInt()
  @Min(1)
  seatingCapacity: number;

  @ApiProperty({ example: 'John Banda' })
  @IsString()
  @IsNotEmpty()
  driverName: string;

  @ApiProperty({ example: '+265991234567' })
  @IsString()
  @IsNotEmpty()
  driverPhone: string;

  @ApiPropertyOptional({ example: 'DL-98765' })
  @IsOptional()
  @IsString()
  driverLicenseNumber?: string;
}