import { Store } from '@/entities/store.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store]), UsersModule],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}
