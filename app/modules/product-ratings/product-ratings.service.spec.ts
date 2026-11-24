jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Product } from '@/entities/product.entity';
import { ProductRating } from '@/entities/product-rating.entity';
import { ProductsService } from '@/modules/products/products.service';
import { CreateProductRatingDto } from '@/modules/product-ratings/dto/create-product-rating.dto';
import { QueryProductRatingDto } from '@/modules/product-ratings/dto/query-product-rating.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { ProductRatingsService } from './product-ratings.service';

describe('ProductRatingsService', () => {
  let service: ProductRatingsService;
  let repository: jest.Mocked<Repository<ProductRating>>;
  let productsService: jest.Mocked<ProductsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ProductRating>>;

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

  const product: Product = {
    id: 2,
    title: 'T-shirt',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createRating = (): ProductRating => ({
    id: 1,
    average: '4.50',
    count: ratingDto.count,
    fiveStarCount: ratingDto.fiveStarCount,
    fourStarCount: ratingDto.fourStarCount,
    threeStarCount: ratingDto.threeStarCount,
    twoStarCount: ratingDto.twoStarCount,
    oneStarCount: ratingDto.oneStarCount,
    productId: ratingDto.productId,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<ProductRating>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProductRating>>;

    productsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;

    service = new ProductRatingsService(repository, productsService);
  });

  describe('create', () => {
    it('should validate the product and create the normalized rating', async () => {
      const rating = createRating();
      productsService.findOne.mockResolvedValue(product);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(rating);
      repository.save.mockResolvedValue(rating);

      await expect(service.create(ratingDto)).resolves.toEqual(rating);
      expect(productsService.findOne).toHaveBeenCalledWith(ratingDto.productId);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { productId: ratingDto.productId },
      });
      expect(repository.create).toHaveBeenCalledWith({
        average: '4.5',
        count: 3,
        fiveStarCount: 1,
        fourStarCount: 1,
        threeStarCount: 1,
        twoStarCount: 0,
        oneStarCount: 0,
        productId: 2,
      });
      expect(repository.save).toHaveBeenCalledWith(rating);
    });

    it('should reject a second aggregate rating for a product', async () => {
      productsService.findOne.mockResolvedValue(product);
      repository.findOne.mockResolvedValue(createRating());

      await expect(service.create(ratingDto)).rejects.toThrow(
        new ConflictException(
          'O produto de id #2 já possui uma avaliação agregada',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not check for existing ratings when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      productsService.findOne.mockRejectedValue(error);

      await expect(service.create(ratingDto)).rejects.toBe(error);
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join the product, filter by product id, and return pagination metadata', async () => {
      const rating = createRating();
      const filters: QueryProductRatingDto = {
        productId: 2,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[rating], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [rating],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'productRating',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'productRating.product',
        'product',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'productRating.productId = :productId',
        { productId: 2 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without a product filter using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryProductRatingDto())).resolves.toEqual(
        {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a rating and load its product', async () => {
      const rating = createRating();
      repository.findOne.mockResolvedValue(rating);

      await expect(service.findOne(rating.id)).resolves.toEqual(rating);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: rating.id },
        relations: { product: true },
      });
    });

    it('should throw not found when the rating does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Avaliação agregada de produto de id #99 não foi encontrada',
        ),
      );
    });
  });

  describe('update', () => {
    it('should normalize updated values and allow the same rating to retain its product', async () => {
      const existing = createRating();
      const updateDto = { average: 4.75, count: 4, productId: 2 };
      const updated = { ...existing, average: '4.75', count: 4 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      productsService.findOne.mockResolvedValue(product);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productsService.findOne).toHaveBeenCalledWith(2);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { productId: 2 },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject moving a rating to a product that already has another rating', async () => {
      const existing = createRating();
      const duplicate = { ...existing, id: 2, productId: 3 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);
      productsService.findOne.mockResolvedValue({ ...product, id: 3 });

      await expect(
        service.update(existing.id, { productId: 3 }),
      ).rejects.toThrow(
        new ConflictException(
          'O produto de id #3 já possui uma avaliação agregada',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the rating does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { average: 4.75 })).rejects.toThrow(
        new NotFoundException(
          'Avaliação agregada de produto de id #99 não foi encontrada',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the rating and return a success message', async () => {
      const rating = createRating();
      repository.findOne.mockResolvedValue(rating);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(rating.id)).resolves.toBe(
        'Avaliação agregada do produto removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(rating.id);
    });

    it('should throw not found when the rating does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Avaliação agregada de produto de id #99 não foi encontrada',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the rating is not deleted', async () => {
      const rating = createRating();
      repository.findOne.mockResolvedValue(rating);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(rating.id)).rejects.toThrow(
        new ConflictException(
          'Não foi possível remover a avaliação agregada do produto',
        ),
      );
    });
  });
});
