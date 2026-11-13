import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateVariantAttributeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  attributeValueId!: number;
}
