import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Favorite } from '@/entities/favorite.entity';
import { Variant } from '@/entities/variant.entity';
import { UsersService } from '@/modules/users/users.service';
import { VariantsService } from '@/modules/variants/variants.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { QueryFavoriteDto } from './dto/query-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

export type FavoritesResponse = {
  data: Favorite[];
  meta: PaginationResponse;
};

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    private readonly usersService: UsersService,
    private readonly variantsService: VariantsService,
  ) {}

  async create(favorite: CreateFavoriteDto) {
    await this.validateReferences(favorite);
    await this.ensureFavoriteDoesNotExist(favorite.userId, favorite.variantId);

    const newFavorite = this.favoritesRepository.create(favorite);

    return this.favoritesRepository.save(newFavorite);
  }

  async query(query: QueryFavoriteDto): Promise<FavoritesResponse> {
    const { userId, variantId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.favoritesRepository.createQueryBuilder('favorite');

    queryBuilder
      .leftJoinAndSelect('favorite.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product');

    if (userId !== undefined) {
      queryBuilder.andWhere('favorite.userId = :userId', { userId });
    }

    if (variantId !== undefined) {
      queryBuilder.andWhere('favorite.variantId = :variantId', { variantId });
    }

    const [favorites, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: favorites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const favorite = await this.favoritesRepository.findOne({
      where: { id },
      relations: { variant: { product: true } },
    });

    if (!favorite) {
      throw new NotFoundException(`Favorito de id #${id} não foi encontrado`);
    }

    return favorite;
  }

  async update(id: number, favorite: UpdateFavoriteDto) {
    const favoriteResponse = await this.findOne(id);

    const variant = await this.validateReferences(favorite);

    const nextUserId = favorite.userId ?? favoriteResponse.userId;
    const nextVariantId = favorite.variantId ?? favoriteResponse.variantId;
    await this.ensureFavoriteDoesNotExist(nextUserId, nextVariantId, id);

    Object.assign(favoriteResponse, favorite);

    if (variant) {
      favoriteResponse.variant = variant;
    }

    return this.favoritesRepository.save(favoriteResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.favoritesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o favorito');
    }

    return 'Favorito removido com sucesso';
  }

  private async validateReferences(
    favorite: UpdateFavoriteDto,
  ): Promise<Variant | undefined> {
    const variant =
      favorite.variantId === undefined
        ? undefined
        : await this.variantsService.findOne(favorite.variantId);

    if (favorite.userId !== undefined) {
      await this.usersService.findOne(favorite.userId);
    }

    return variant;
  }

  private async ensureFavoriteDoesNotExist(
    userId: number,
    variantId: number,
    excludeId?: number,
  ) {
    const duplicate = await this.favoritesRepository.findOne({
      where: { userId, variantId },
    });

    if (duplicate && duplicate.id !== excludeId) {
      throw new ConflictException(
        'Esta variante já está nos favoritos deste usuário',
      );
    }
  }
}
