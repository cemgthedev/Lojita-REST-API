import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  brand?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/)
  last4?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  expMonth?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  expYear?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentMethodId!: number;
}
