import { Specification } from '@/entities/specification.entity';
import { ProductsModule } from '@/modules/products/products.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecificationsController } from './specifications.controller';
import { SpecificationsService } from './specifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Specification]), ProductsModule],
  controllers: [SpecificationsController],
  providers: [SpecificationsService],
})
export class SpecificationsModule {}
