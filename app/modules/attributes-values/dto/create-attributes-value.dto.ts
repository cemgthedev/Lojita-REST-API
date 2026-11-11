import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateAttributesValueDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  attributeId!: number;
}
