jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Favorite } from '@/entities/favorite.entity';
import { User } from '@/entities/user.entity';
import { Variant } from '@/entities/variant.entity';
import { CreateFavoriteDto } from '@/modules/favorites/dto/create-favorite.dto';
import { QueryFavoriteDto } from '@/modules/favorites/dto/query-favorite.dto';
import { UsersService } from '@/modules/users/users.service';
import { Role } from '@/modules/users/enums/role.enum';
import { VariantsService } from '@/modules/variants/variants.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let repository: jest.Mocked<Repository<Favorite>>;
  let usersService: jest.Mocked<UsersService>;
  let variantsService: jest.Mocked<VariantsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Favorite>>;

  const favoriteDto: CreateFavoriteDto = {
    userId: 7,
    variantId: 3,
  };

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const variant: Variant = {
    id: 3,
    price: 99.99,
    stock: 5,
    sku: 'SHIRT-BLUE-M',
    status: STATUS.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createFavorite = (): Favorite => ({
    id: 1,
    ...favoriteDto,
    user,
    variant,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Favorite>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Favorite>>;

    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    variantsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<VariantsService>;

    service = new FavoritesService(repository, usersService, variantsService);
  });

  describe('create', () => {
    it('should validate references and create the favorite', async () => {
      const favorite = createFavorite();
      variantsService.findOne.mockResolvedValue(variant);
      usersService.findOne.mockResolvedValue(user);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(favorite);
      repository.save.mockResolvedValue(favorite);

      await expect(service.create(favoriteDto)).resolves.toEqual(favorite);
      expect(variantsService.findOne).toHaveBeenCalledWith(
        favoriteDto.variantId,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(favoriteDto.userId);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: favoriteDto.userId, variantId: favoriteDto.variantId },
      });
      expect(repository.create).toHaveBeenCalledWith(favoriteDto);
      expect(repository.save).toHaveBeenCalledWith(favorite);
    });

    it('should not create the favorite when a referenced variant does not exist', async () => {
      const error = new NotFoundException(
        'Variante de id #3 não foi encontrada',
      );
      variantsService.findOne.mockRejectedValue(error);

      await expect(service.create(favoriteDto)).rejects.toBe(error);
      expect(usersService.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not create the favorite when a referenced user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      variantsService.findOne.mockResolvedValue(variant);
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(favoriteDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should reject a duplicate favorite', async () => {
      repository.findOne.mockResolvedValue(createFavorite());

      await expect(service.create(favoriteDto)).rejects.toThrow(
        new ConflictException(
          'Esta variante já está nos favoritos deste usuário',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const favorite = createFavorite();
      const filters: QueryFavoriteDto = {
        userId: 7,
        variantId: 3,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[favorite], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [favorite],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('favorite');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'favorite.variant',
        'variant',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'variant.product',
        'product',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'favorite.userId = :userId',
        { userId: 7 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'favorite.variantId = :variantId',
        { variantId: 3 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryFavoriteDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a favorite and load its variant and product', async () => {
      const favorite = createFavorite();
      repository.findOne.mockResolvedValue(favorite);

      await expect(service.findOne(favorite.id)).resolves.toEqual(favorite);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: favorite.id },
        relations: { variant: { product: true } },
      });
    });

    it('should throw not found when the favorite does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Favorito de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the favorite', async () => {
      const existing = createFavorite();
      const nextVariant = { ...variant, id: 4 };
      const updateDto = { userId: 8, variantId: 4 };
      const updated = {
        ...existing,
        ...updateDto,
        variant: nextVariant,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      variantsService.findOne.mockResolvedValue(nextVariant);
      usersService.findOne.mockResolvedValue({ ...user, id: 8 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(variantsService.findOne).toHaveBeenCalledWith(4);
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { userId: 8, variantId: 4 },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update that duplicates another favorite', async () => {
      const existing = createFavorite();
      const duplicate = { ...existing, id: 2 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);
      variantsService.findOne.mockResolvedValue(variant);

      await expect(
        service.update(existing.id, { variantId: variant.id }),
      ).rejects.toThrow(
        new ConflictException(
          'Esta variante já está nos favoritos deste usuário',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the favorite does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { variantId: 4 })).rejects.toThrow(
        new NotFoundException('Favorito de id #99 não foi encontrado'),
      );
      expect(variantsService.findOne).not.toHaveBeenCalled();
      expect(usersService.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the favorite and return a success message', async () => {
      const favorite = createFavorite();
      repository.findOne.mockResolvedValue(favorite);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(favorite.id)).resolves.toBe(
        'Favorito removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(favorite.id);
    });

    it('should throw not found when the favorite does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Favorito de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the favorite is not deleted', async () => {
      const favorite = createFavorite();
      repository.findOne.mockResolvedValue(favorite);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(favorite.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o favorito'),
      );
    });
  });
});
