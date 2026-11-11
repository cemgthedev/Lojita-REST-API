import { DBConnectModule } from '@/dinamic/db-connect.module';
import { AttributesModule } from '@/modules/attributes/attribute.module';
import { AttributesValuesModule } from '@/modules/attributes-values/attributes-values.module';
import { ProductsModule } from '@/modules/products/products.module';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { CategoriesModule } from '../modules/categories/categories.module';
import { StoresModule } from '../modules/stores/stores.module';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DBConnectModule.register({
      type: 'test',
    }),
    UsersModule,
    CategoriesModule,
    StoresModule,
    AttributesModule,
    AttributesValuesModule,
    ProductsModule,
    VariantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
