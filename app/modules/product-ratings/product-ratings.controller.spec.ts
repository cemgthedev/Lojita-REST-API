jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { ProductRating } from '@/entities/product-rating.entity';
import { CreateProductRatingDto } from '@/modules/product-ratings/dto/create-product-rating.dto';
import { QueryProductRatingDto } from '@/modules/product-ratings/dto/query-product-rating.dto';
import { UpdateProductRatingDto } from '@/modules/product-ratings/dto/update-product-rating.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductRatingsController } from './product-ratings.controller';
import { ProductRatingsService } from './product-ratings.service';

type ProductRatingsServiceMock = jest.Mocked<
  Pick<
    ProductRatingsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('ProductRatingsController', () => {
  let controller: ProductRatingsController;
  let productRatingsService: ProductRatingsServiceMock;

  const ratingDto: CreateProductRatingDto = {
    average: 4.5,
    count: 3,
    fiveStarCount: 1,
    fourStarCount: 1,
    threeStarCount: 1,
    twoStarCount: 0,
    oneStarCount: 0,
    productId: 2,
  };

  const rating: ProductRating = {
    id: 1,
    average: '4.50',
    count: 3,
    fiveStarCount: 1,
    fourStarCount: 1,
    threeStarCount: 1,
    twoStarCount: 0,
    oneStarCount: 0,
    productId: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    productRatingsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductRatingsController],
      providers: [
        { provide: ProductRatingsService, useValue: productRatingsService },
      ],
    }).compile();

    controller = moduleRef.get(ProductRatingsController);
  });

  describe('create', () => {
    it('should pass the rating data to the service and return the rating', async () => {
      productRatingsService.create.mockResolvedValue(rating);

      await expect(controller.create(ratingDto)).resolves.toEqual(rating);
      expect(productRatingsService.create).toHaveBeenCalledWith(ratingDto);
    });

    it('should propagate conflict when the product already has an aggregate rating', async () => {
      const error = new ConflictException(
        'O produto de id #2 já possui uma avaliação agregada',
      );
      productRatingsService.create.mockRejectedValue(error);

      await expect(controller.create(ratingDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching ratings', async () => {
      const query: QueryProductRatingDto = {
        productId: 2,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [rating],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      productRatingsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(productRatingsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar avaliações agregadas');
      productRatingsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryProductRatingDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the rating id to the service and return the rating', async () => {
      productRatingsService.findOne.mockResolvedValue(rating);

      await expect(controller.findOne(rating.id)).resolves.toEqual(rating);
      expect(productRatingsService.findOne).toHaveBeenCalledWith(rating.id);
    });

    it('should propagate not found when the rating does not exist', async () => {
      const error = new NotFoundException(
        'Avaliação agregada de produto de id #99 não foi encontrada',
      );
      productRatingsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the rating id and update data to the service', async () => {
      const updateDto: UpdateProductRatingDto = {
        average: 4.75,
        count: 4,
      };
      const updated = { ...rating, average: '4.75', count: 4 };
      productRatingsService.update.mockResolvedValue(updated);

      await expect(controller.update(rating.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productRatingsService.update).toHaveBeenCalledWith(
        rating.id,
        updateDto,
      );
    });

    it('should propagate not found when the rating does not exist', async () => {
      const error = new NotFoundException(
        'Avaliação agregada de produto de id #99 não foi encontrada',
      );
      productRatingsService.update.mockRejectedValue(error);

      await expect(controller.update(99, { average: 4.75 })).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('should pass the rating id to the service and return its result', async () => {
      productRatingsService.remove.mockResolvedValue(
        'Avaliação agregada do produto removida com sucesso',
      );

      await expect(controller.remove(rating.id)).resolves.toBe(
        'Avaliação agregada do produto removida com sucesso',
      );
      expect(productRatingsService.remove).toHaveBeenCalledWith(rating.id);
    });

    it('should propagate not found when the rating does not exist', async () => {
      const error = new NotFoundException(
        'Avaliação agregada de produto de id #99 não foi encontrada',
      );
      productRatingsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the rating cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover a avaliação agregada do produto',
      );
      productRatingsService.remove.mockRejectedValue(error);

      await expect(controller.remove(rating.id)).rejects.toBe(error);
    });
  });
});
