import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cartId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;
}
