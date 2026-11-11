import { Attribute } from '@/entities/attribute.entity';
import { AttributesController } from '@/modules/attributes/attribute.controller';
import { AttributesService } from '@/modules/attributes/attribute.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Attribute])],
  controllers: [AttributesController],
  providers: [AttributesService],
})
export class AttributesModule {}
