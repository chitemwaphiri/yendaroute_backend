
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFareDto {
  @IsInt()
  @Min(1)
  routeId: number;

  @IsInt()
  @Min(1)
  originStopId: number;

  @IsInt()
  @Min(1)
  destinationStopId: number;

  @IsString()
  @Matches(/^(?=.*[1-9])\d+(\.\d{1,2})?$/)
  amount: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
