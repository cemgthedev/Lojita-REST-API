jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { ProductReview } from '@/entities/product-review.entity';
import { CreateProductReviewDto } from '@/modules/product-reviews/dto/create-product-review.dto';
import { QueryProductReviewDto } from '@/modules/product-reviews/dto/query-product-review.dto';
import { UpdateProductReviewDto } from '@/modules/product-reviews/dto/update-product-review.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductReviewsController } from './product-reviews.controller';
import { ProductReviewsService } from './product-reviews.service';

type ProductReviewsServiceMock = jest.Mocked<
  Pick<
    ProductReviewsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('ProductReviewsController', () => {
  let controller: ProductReviewsController;
  let productReviewsService: ProductReviewsServiceMock;

  const reviewDto: CreateProductReviewDto = {
    rating: 5,
    comment: 'Great product',
    status: STATUS.ACTIVE,
    userId: 3,
    productId: 2,
  };

  const review: ProductReview = {
    id: 1,
    ...reviewDto,
    status: STATUS.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    productReviewsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductReviewsController],
      providers: [
        { provide: ProductReviewsService, useValue: productReviewsService },
      ],
    }).compile();

    controller = moduleRef.get(ProductReviewsController);
  });

  describe('create', () => {
    it('should pass the review data to the service and return the review', async () => {
      productReviewsService.create.mockResolvedValue(review);

      await expect(controller.create(reviewDto)).resolves.toEqual(review);
      expect(productReviewsService.create).toHaveBeenCalledWith(reviewDto);
    });

    it('should propagate not found when a related record does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      productReviewsService.create.mockRejectedValue(error);

      await expect(controller.create(reviewDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching reviews', async () => {
      const query: QueryProductReviewDto = {
        rating: 5,
        status: STATUS.ACTIVE,
        userId: 3,
        productId: 2,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [review],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      productReviewsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(productReviewsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar avaliações de produtos');
      productReviewsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryProductReviewDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the review id to the service and return the review', async () => {
      productReviewsService.findOne.mockResolvedValue(review);

      await expect(controller.findOne(review.id)).resolves.toEqual(review);
      expect(productReviewsService.findOne).toHaveBeenCalledWith(review.id);
    });

    it('should propagate not found when the review does not exist', async () => {
      const error = new NotFoundException(
        'Avaliação de produto de id #99 não foi encontrada',
      );
      productReviewsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the review id and update data to the service', async () => {
      const updateDto: UpdateProductReviewDto = {
        comment: 'Updated review',
      };
      const updated = { ...review, ...updateDto };
      productReviewsService.update.mockResolvedValue(updated);

      await expect(controller.update(review.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productReviewsService.update).toHaveBeenCalledWith(
        review.id,
        updateDto,
      );
    });

    it('should propagate not found when the review does not exist', async () => {
      const error = new NotFoundException(
        'Avaliação de produto de id #99 não foi encontrada',
      );
      productReviewsService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { comment: 'Updated review' }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the review id to the service and return its result', async () => {
      productReviewsService.remove.mockResolvedValue(
        'Avaliação removida com sucesso',
      );

      await expect(controller.remove(review.id)).resolves.toBe(
        'Avaliação removida com sucesso',
      );
      expect(productReviewsService.remove).toHaveBeenCalledWith(review.id);
    });

    it('should propagate not found when the review does not exist', async () => {
      const error = new NotFoundException(
        'Avaliação de produto de id #99 não foi encontrada',
      );
      productReviewsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the review cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover a avaliação',
      );
      productReviewsService.remove.mockRejectedValue(error);

      await expect(controller.remove(review.id)).rejects.toBe(error);
    });
  });
});
