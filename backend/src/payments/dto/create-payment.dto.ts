import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, MinLength } from 'class-validator';

const PAYMENT_METHOD_INPUTS = [
  'Airtel Money',
  'TNM Mpamba',
  'Mobile Money',
  'MobileMoney',
  'Bank Card',
  'Card',
] as const;

export class CreatePaymentDto {
  @ApiProperty({
    example: 'Airtel Money',
    enum: [...PAYMENT_METHOD_INPUTS],
    description:
      'Frontend payment method. Provider labels are normalized to mobile money or card.',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const method = value.trim().toLowerCase();
    if (method === 'bank card' || method === 'card') return 'Card';
    if (
      method === 'airtel money' ||
      method === 'tnm mpamba' ||
      method === 'mobile money' ||
      method === 'mobilemoney'
    ) {
      return 'MobileMoney';
    }
    return value;
  })
  @IsIn(['MobileMoney', 'Card'])
  paymentMethod: 'MobileMoney' | 'Card';

  @ApiProperty({ example: 'MPAY-123456' })
  @IsString()
  @MinLength(1)
  paymentReference: string;
}