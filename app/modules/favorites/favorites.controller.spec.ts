jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Favorite } from '@/entities/favorite.entity';
import { CreateFavoriteDto } from '@/modules/favorites/dto/create-favorite.dto';
import { QueryFavoriteDto } from '@/modules/favorites/dto/query-favorite.dto';
import { UpdateFavoriteDto } from '@/modules/favorites/dto/update-favorite.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

type FavoritesServiceMock = jest.Mocked<
  Pick<FavoritesService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let favoritesService: FavoritesServiceMock;

  const favoriteDto: CreateFavoriteDto = {
    userId: 7,
    variantId: 3,
  };

  const favorite: Favorite = {
    id: 1,
    ...favoriteDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    favoritesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [{ provide: FavoritesService, useValue: favoritesService }],
    }).compile();

    controller = moduleRef.get(FavoritesController);
  });

  describe('create', () => {
    it('should pass the favorite data to the service and return the favorite', async () => {
      favoritesService.create.mockResolvedValue(favorite);

      await expect(controller.create(favoriteDto)).resolves.toEqual(favorite);
      expect(favoritesService.create).toHaveBeenCalledWith(favoriteDto);
    });

    it('should propagate a conflict when the favorite already exists', async () => {
      const error = new ConflictException(
        'Esta variante já está nos favoritos deste usuário',
      );
      favoritesService.create.mockRejectedValue(error);

      await expect(controller.create(favoriteDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching favorites', async () => {
      const query: QueryFavoriteDto = {
        userId: 7,
        variantId: 3,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [favorite],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      favoritesService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(favoritesService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar favoritos');
      favoritesService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryFavoriteDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the favorite id to the service and return the favorite', async () => {
      favoritesService.findOne.mockResolvedValue(favorite);

      await expect(controller.findOne(favorite.id)).resolves.toEqual(favorite);
      expect(favoritesService.findOne).toHaveBeenCalledWith(favorite.id);
    });

    it('should propagate not found when the favorite does not exist', async () => {
      const error = new NotFoundException(
        'Favorito de id #99 não foi encontrado',
      );
      favoritesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the favorite id and update data to the service', async () => {
      const updateDto: UpdateFavoriteDto = { variantId: 4 };
      const updated = { ...favorite, ...updateDto };
      favoritesService.update.mockResolvedValue(updated);

      await expect(controller.update(favorite.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(favoritesService.update).toHaveBeenCalledWith(
        favorite.id,
        updateDto,
      );
    });

    it('should propagate not found when the favorite does not exist', async () => {
      const error = new NotFoundException(
        'Favorito de id #99 não foi encontrado',
      );
      favoritesService.update.mockRejectedValue(error);

      await expect(controller.update(99, { variantId: 4 })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the favorite id to the service and return its result', async () => {
      favoritesService.remove.mockResolvedValue(
        'Favorito removido com sucesso',
      );

      await expect(controller.remove(favorite.id)).resolves.toBe(
        'Favorito removido com sucesso',
      );
      expect(favoritesService.remove).toHaveBeenCalledWith(favorite.id);
    });

    it('should propagate not found when the favorite does not exist', async () => {
      const error = new NotFoundException(
        'Favorito de id #99 não foi encontrado',
      );
      favoritesService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the favorite cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o favorito',
      );
      favoritesService.remove.mockRejectedValue(error);

      await expect(controller.remove(favorite.id)).rejects.toBe(error);
    });
  });
});
