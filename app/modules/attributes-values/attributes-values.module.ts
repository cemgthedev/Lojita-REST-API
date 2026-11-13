import { AttributeValue } from '@/entities/attribute-value.entity';
import { AttributesModule } from '@/modules/attributes/attribute.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributesValuesController } from './attributes-values.controller';
import { AttributesValuesService } from './attributes-values.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttributeValue]), AttributesModule],
  controllers: [AttributesValuesController],
  providers: [AttributesValuesService],
  exports: [AttributesValuesService],
})
export class AttributesValuesModule {}
