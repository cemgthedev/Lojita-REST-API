import { DBConnectModule } from '@/dinamic/db-connect.module';
import { Module } from '@nestjs/common';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from '../modules/categories/categories.module';
import { StoresModule } from '../modules/stores/stores.module';

@Module({
  imports: [
    DBConnectModule.register({
      type: 'test',
    }),
    UsersModule,
    CategoriesModule,
    StoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
