import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateVariantImageDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;
}
