jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Product } from '@/entities/product.entity';
import { ProductReview } from '@/entities/product-review.entity';
import { User } from '@/entities/user.entity';
import { ProductsService } from '@/modules/products/products.service';
import { CreateProductReviewDto } from '@/modules/product-reviews/dto/create-product-review.dto';
import { QueryProductReviewDto } from '@/modules/product-reviews/dto/query-product-review.dto';
import { UsersService } from '@/modules/users/users.service';
import { Role } from '@/modules/users/enums/role.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { ProductReviewsService } from './product-reviews.service';

describe('ProductReviewsService', () => {
  let service: ProductReviewsService;
  let repository: jest.Mocked<Repository<ProductReview>>;
  let productsService: jest.Mocked<ProductsService>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ProductReview>>;

  const reviewDto: CreateProductReviewDto = {
    rating: 5,
    comment: 'Great product',
    status: STATUS.ACTIVE,
    userId: 3,
    productId: 2,
  };

  const product: Product = {
    id: 2,
    title: 'T-shirt',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const user: User = {
    id: 3,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createReview = (): ProductReview => ({
    id: 1,
    ...reviewDto,
    status: STATUS.ACTIVE,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<ProductReview>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProductReview>>;

    productsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;
    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new ProductReviewsService(
      repository,
      productsService,
      usersService,
    );
  });

  describe('create', () => {
    it('should validate the user and product before creating the review', async () => {
      const review = createReview();
      usersService.findOne.mockResolvedValue(user);
      productsService.findOne.mockResolvedValue(product);
      repository.create.mockReturnValue(review);
      repository.save.mockResolvedValue(review);

      await expect(service.create(reviewDto)).resolves.toEqual(review);
      expect(usersService.findOne).toHaveBeenCalledWith(reviewDto.userId);
      expect(productsService.findOne).toHaveBeenCalledWith(reviewDto.productId);
      expect(repository.create).toHaveBeenCalledWith(reviewDto);
      expect(repository.save).toHaveBeenCalledWith(review);
    });

    it('should not create a review when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #3 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(reviewDto)).rejects.toBe(error);
      expect(productsService.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not create a review when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      usersService.findOne.mockResolvedValue(user);
      productsService.findOne.mockRejectedValue(error);

      await expect(service.create(reviewDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const review = createReview();
      const filters: QueryProductReviewDto = {
        rating: 5,
        status: STATUS.ACTIVE,
        userId: 3,
        productId: 2,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[review], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [review],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'productReview',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'productReview.user',
        'user',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'productReview.product',
        'product',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'productReview.rating = :rating',
        { rating: 5 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'productReview.status = :status',
        { status: STATUS.ACTIVE },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'productReview.userId = :userId',
        { userId: 3 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'productReview.productId = :productId',
        { productId: 2 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryProductReviewDto())).resolves.toEqual(
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
    it('should find a review and load its user and product', async () => {
      const review = createReview();
      repository.findOne.mockResolvedValue(review);

      await expect(service.findOne(review.id)).resolves.toEqual(review);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: review.id },
        relations: { user: true, product: true },
      });
    });

    it('should throw not found when the review does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Avaliação de produto de id #99 não foi encontrada',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the review', async () => {
      const existing = createReview();
      const updatedDto = {
        userId: 4,
        productId: 5,
        comment: 'Updated review',
      };
      const updated = { ...existing, ...updatedDto };
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockResolvedValue({ ...user, id: 4 });
      productsService.findOne.mockResolvedValue({ ...product, id: 5 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updatedDto)).resolves.toEqual(
        updated,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(4);
      expect(productsService.findOne).toHaveBeenCalledWith(5);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the review does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { comment: 'Updated review' }),
      ).rejects.toThrow(
        new NotFoundException(
          'Avaliação de produto de id #99 não foi encontrada',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the review and return a success message', async () => {
      const review = createReview();
      repository.findOne.mockResolvedValue(review);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(review.id)).resolves.toBe(
        'Avaliação removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(review.id);
    });

    it('should throw not found when the review does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Avaliação de produto de id #99 não foi encontrada',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the review is not deleted', async () => {
      const review = createReview();
      repository.findOne.mockResolvedValue(review);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(review.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a avaliação'),
      );
    });
  });
});
