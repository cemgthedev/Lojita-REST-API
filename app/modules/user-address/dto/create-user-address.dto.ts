import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(TYPE_ADDRESS)
  type?: TYPE_ADDRESS;

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  cep!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  street!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @Length(2, 2)
  state!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  neighborhood!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  complement?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;
}
