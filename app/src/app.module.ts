import { DBConnectModule } from '@/dinamic/db-connect.module';
import { AttributesValuesModule } from '@/modules/attributes-values/attributes-values.module';
import { AttributesModule } from '@/modules/attributes/attribute.module';
import { CardsModule } from '@/modules/cards/cards.module';
import { CartItemsModule } from '@/modules/cart-items/cart-items.module';
import { CartsModule } from '@/modules/carts/carts.module';
import { ChatParticipantsModule } from '@/modules/chat-participants/chat-participants.module';
import { ChatsModule } from '@/modules/chats/chats.module';
import { CouponCategoriesModule } from '@/modules/coupon-categories/coupon-categories.module';
import { CouponImagesModule } from '@/modules/coupon-images/coupon-images.module';
import { CouponProductsModule } from '@/modules/coupon-products/coupon-products.module';
import { CouponUsagesModule } from '@/modules/coupon-usages/coupon-usages.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { FavoritesModule } from '@/modules/favorites/favorites.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { OrderAddressesModule } from '@/modules/order-addresses/order-addresses.module';
import { OrderItemsModule } from '@/modules/order-items/order-items.module';
import { OrderSellersModule } from '@/modules/order-sellers/order-sellers.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { PaymentMethodsModule } from '@/modules/payment-methods/payment-methods.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { ProductRatingsModule } from '@/modules/product-ratings/product-ratings.module';
import { ProductReviewsModule } from '@/modules/product-reviews/product-reviews.module';
import { ProductsModule } from '@/modules/products/products.module';
import { SpecificationsModule } from '@/modules/specifications/specifications.module';
import { SupportTicketsModule } from '@/modules/support-tickets/support-tickets.module';
import { UserAddressModule } from '@/modules/user-address/user-address.module';
import { VariantAttributesModule } from '@/modules/variant-attributes/variant-attributes.module';
import { VariantImagesModule } from '@/modules/variant-images/variant-images.module';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CategoriesModule } from '../modules/categories/categories.module';
import { StoresModule } from '../modules/stores/stores.module';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
        blockDuration: 10000,
      },
    ]),
    DBConnectModule.register({
      type: 'test',
    }),
    UsersModule,
    UserAddressModule,
    CategoriesModule,
    StoresModule,
    AttributesModule,
    AttributesValuesModule,
    CardsModule,
    CartItemsModule,
    CartsModule,
    ChatsModule,
    ChatParticipantsModule,
    MessagesModule,
    SupportTicketsModule,
    CouponsModule,
    CouponImagesModule,
    CouponUsagesModule,
    CouponProductsModule,
    CouponCategoriesModule,
    FavoritesModule,
    OrdersModule,
    OrderAddressesModule,
    OrderItemsModule,
    OrderSellersModule,
    PaymentsModule,
    PaymentMethodsModule,
    ProductsModule,
    ProductReviewsModule,
    ProductRatingsModule,
    SpecificationsModule,
    VariantsModule,
    VariantAttributesModule,
    VariantImagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
