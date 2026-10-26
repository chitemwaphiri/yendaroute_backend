import { PartialType } from '@nestjs/mapped-types';
import { CreateFareDto } from './create-fare.dto';

export class UpdateFareDto extends PartialType(CreateFareDto) {}