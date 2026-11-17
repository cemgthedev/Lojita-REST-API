import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateProductRatingDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  average!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  count!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fiveStarCount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fourStarCount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  threeStarCount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  twoStarCount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  oneStarCount?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;
}
