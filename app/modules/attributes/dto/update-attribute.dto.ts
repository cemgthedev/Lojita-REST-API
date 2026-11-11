import { CreateAttributeDto } from '@/modules/attributes/dto/create-attribute.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateAttributeDto extends PartialType(CreateAttributeDto) {}
