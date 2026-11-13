import { DBConnectModule } from '@/dinamic/db-connect.module';
import { AttributesModule } from '@/modules/attributes/attribute.module';
import { AttributesValuesModule } from '@/modules/attributes-values/attributes-values.module';
import { CartItemsModule } from '@/modules/cart-items/cart-items.module';
import { CartsModule } from '@/modules/carts/carts.module';
import { FavoritesModule } from '@/modules/favorites/favorites.module';
import { ProductsModule } from '@/modules/products/products.module';
import { SpecificationsModule } from '@/modules/specifications/specifications.module';
import { VariantAttributesModule } from '@/modules/variant-attributes/variant-attributes.module';
import { VariantImagesModule } from '@/modules/variant-images/variant-images.module';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { CategoriesModule } from '../modules/categories/categories.module';
import { StoresModule } from '../modules/stores/stores.module';
import { UsersModule } from '../modules/users/users.module';
import { UserAddressModule } from '@/modules/user-address/user-address.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DBConnectModule.register({
      type: 'test',
    }),
    UsersModule,
    UserAddressModule,
    CategoriesModule,
    StoresModule,
    AttributesModule,
    AttributesValuesModule,
    CartItemsModule,
    CartsModule,
    FavoritesModule,
    ProductsModule,
    SpecificationsModule,
    VariantsModule,
    VariantAttributesModule,
    VariantImagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
