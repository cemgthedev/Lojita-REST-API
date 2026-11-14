import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsEnum(PAYMENT_METHOD_TYPE)
  type!: PAYMENT_METHOD_TYPE;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  method!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provider!: string;

  @IsString()
  @IsNotEmpty()
  providerToken!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;
}
