import { PaginationDto } from '@/common/dtos/pagination.dto';
import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryOrderAddressDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TYPE_ADDRESS)
  type?: TYPE_ADDRESS;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsOptional()
  @IsString()
  recipientName?: string;
}
