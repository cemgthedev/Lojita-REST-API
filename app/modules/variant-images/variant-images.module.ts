import { VariantImage } from '@/entities/variant-image.entity';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantImagesController } from './variant-images.controller';
import { VariantImagesService } from './variant-images.service';

@Module({
  imports: [TypeOrmModule.forFeature([VariantImage]), VariantsModule],
  controllers: [VariantImagesController],
  providers: [VariantImagesService],
})
export class VariantImagesModule {}
