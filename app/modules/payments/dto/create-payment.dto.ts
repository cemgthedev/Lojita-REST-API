import { PAYMENT_STATUS } from '@/modules/payments/enums/payment-status.enum';
import { PAYMENT_TYPE } from '@/modules/payments/types/payment.type';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provider!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  providerPaymentId!: string;

  @IsEnum(PAYMENT_TYPE)
  methodType!: PAYMENT_TYPE;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsEnum(PAYMENT_STATUS)
  status?: PAYMENT_STATUS;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentMethodId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date | null;
}
