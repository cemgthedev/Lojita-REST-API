import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCouponImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId!: number;
}
