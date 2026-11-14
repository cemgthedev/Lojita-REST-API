import { PaginationDto } from '@/common/dtos/pagination.dto';
import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryPaymentMethodDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PAYMENT_METHOD_TYPE)
  type?: PAYMENT_METHOD_TYPE;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}
