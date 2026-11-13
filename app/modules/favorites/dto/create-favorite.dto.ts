import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateFavoriteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;
}
