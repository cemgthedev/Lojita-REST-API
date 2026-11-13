import { Favorite } from '@/entities/favorite.entity';
import { UsersModule } from '@/modules/users/users.module';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite]), UsersModule, VariantsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
