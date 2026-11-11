import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributesValueDto } from './create-attributes-value.dto';

export class UpdateAttributesValueDto extends PartialType(
  CreateAttributesValueDto,
) {}
