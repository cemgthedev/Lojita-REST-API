import { DBConnectModule } from '@/dinamic/db-connect.module';
import { Module } from '@nestjs/common';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DBConnectModule.register({
      type: 'test',
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
