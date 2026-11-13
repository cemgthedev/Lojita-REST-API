import { PaginationDto } from '@/common/dtos/pagination.dto';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class QueryOrderDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ORDER_STATUS)
  status?: ORDER_STATUS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}
