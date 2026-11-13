import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantImageDto } from './create-variant-image.dto';

export class UpdateVariantImageDto extends PartialType(CreateVariantImageDto) {}
