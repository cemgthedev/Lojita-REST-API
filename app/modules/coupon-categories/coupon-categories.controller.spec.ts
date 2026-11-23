jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { CouponCategory } from '@/entities/coupon-category.entity';
import { CreateCouponCategoryDto } from '@/modules/coupon-categories/dto/create-coupon-category.dto';
import { QueryCouponCategoryDto } from '@/modules/coupon-categories/dto/query-coupon-category.dto';
import { UpdateCouponCategoryDto } from '@/modules/coupon-categories/dto/update-coupon-category.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CouponCategoriesController } from './coupon-categories.controller';
import { CouponCategoriesService } from './coupon-categories.service';

type CouponCategoriesServiceMock = jest.Mocked<
  Pick<
    CouponCategoriesService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('CouponCategoriesController', () => {
  let controller: CouponCategoriesController;
  let couponCategoriesService: CouponCategoriesServiceMock;

  const associationDto: CreateCouponCategoryDto = {
    couponId: 4,
    categoryId: 6,
  };

  const association: CouponCategory = {
    ...associationDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    couponCategoriesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CouponCategoriesController],
      providers: [
        { provide: CouponCategoriesService, useValue: couponCategoriesService },
      ],
    }).compile();

    controller = moduleRef.get(CouponCategoriesController);
  });

  it('should pass association data to the service on create', async () => {
    couponCategoriesService.create.mockResolvedValue(association);

    await expect(controller.create(associationDto)).resolves.toEqual(
      association,
    );
    expect(couponCategoriesService.create).toHaveBeenCalledWith(associationDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCouponCategoryDto = {
      couponId: 4,
      categoryId: 6,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [association],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    couponCategoriesService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(couponCategoriesService.query).toHaveBeenCalledWith(query);
  });

  it('should pass composite keys to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Associação entre cupom e categoria não foi encontrada',
    );
    couponCategoriesService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(4, 6)).rejects.toBe(error);
    expect(couponCategoriesService.findOne).toHaveBeenCalledWith(4, 6);
  });

  it('should pass composite keys and update data to the service', async () => {
    const updateDto: UpdateCouponCategoryDto = { categoryId: 7 };
    const updated = { ...association, categoryId: 7 };
    couponCategoriesService.update.mockResolvedValue(updated);

    await expect(controller.update(4, 6, updateDto)).resolves.toEqual(updated);
    expect(couponCategoriesService.update).toHaveBeenCalledWith(
      4,
      6,
      updateDto,
    );
  });

  it('should pass composite keys to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover a associação entre cupom e categoria',
    );
    couponCategoriesService.remove.mockRejectedValue(error);

    await expect(controller.remove(4, 6)).rejects.toBe(error);
    expect(couponCategoriesService.remove).toHaveBeenCalledWith(4, 6);
  });
});
