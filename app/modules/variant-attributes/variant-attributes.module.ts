import { VariantAttribute } from '@/entities/variant-attribute.entity';
import { AttributesValuesModule } from '@/modules/attributes-values/attributes-values.module';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantAttributesController } from './variant-attributes.controller';
import { VariantAttributesService } from './variant-attributes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VariantAttribute]),
    VariantsModule,
    AttributesValuesModule,
  ],
  controllers: [VariantAttributesController],
  providers: [VariantAttributesService],
})
export class VariantAttributesModule {}
