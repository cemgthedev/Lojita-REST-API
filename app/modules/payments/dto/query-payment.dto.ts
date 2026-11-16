import { PaginationDto } from '@/common/dtos/pagination.dto';
import { PAYMENT_STATUS } from '@/modules/payments/enums/payment-status.enum';
import { PAYMENT_TYPE } from '@/modules/payments/types/payment.type';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryPaymentDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PAYMENT_STATUS)
  status?: PAYMENT_STATUS;

  @IsOptional()
  @IsEnum(PAYMENT_TYPE)
  methodType?: PAYMENT_TYPE;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentMethodId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;
}
