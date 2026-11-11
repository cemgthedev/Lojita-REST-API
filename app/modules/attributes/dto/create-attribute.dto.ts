import { ATRIBUTE_TYPE } from '@/modules/attributes/enums/type.enum';
import { IsEnum, IsString } from 'class-validator';

export class CreateAttributeDto {
  @IsString()
  name!: string;

  @IsEnum(ATRIBUTE_TYPE)
  type!: ATRIBUTE_TYPE;
}
