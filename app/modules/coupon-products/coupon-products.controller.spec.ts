jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { CouponProduct } from '@/entities/coupon-product.entity';
import { CreateCouponProductDto } from '@/modules/coupon-products/dto/create-coupon-product.dto';
import { QueryCouponProductDto } from '@/modules/coupon-products/dto/query-coupon-product.dto';
import { UpdateCouponProductDto } from '@/modules/coupon-products/dto/update-coupon-product.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CouponProductsController } from './coupon-products.controller';
import { CouponProductsService } from './coupon-products.service';

type CouponProductsServiceMock = jest.Mocked<
  Pick<
    CouponProductsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('CouponProductsController', () => {
  let controller: CouponProductsController;
  let couponProductsService: CouponProductsServiceMock;

  const associationDto: CreateCouponProductDto = {
    couponId: 4,
    productId: 8,
  };

  const association: CouponProduct = {
    ...associationDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    couponProductsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CouponProductsController],
      providers: [
        { provide: CouponProductsService, useValue: couponProductsService },
      ],
    }).compile();

    controller = moduleRef.get(CouponProductsController);
  });

  it('should pass association data to the service on create', async () => {
    couponProductsService.create.mockResolvedValue(association);

    await expect(controller.create(associationDto)).resolves.toEqual(
      association,
    );
    expect(couponProductsService.create).toHaveBeenCalledWith(associationDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCouponProductDto = {
      couponId: 4,
      productId: 8,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [association],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    couponProductsService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(couponProductsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass composite keys to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Associação entre cupom e produto não foi encontrada',
    );
    couponProductsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(4, 8)).rejects.toBe(error);
    expect(couponProductsService.findOne).toHaveBeenCalledWith(4, 8);
  });

  it('should pass composite keys and update data to the service', async () => {
    const updateDto: UpdateCouponProductDto = { productId: 9 };
    const updated = { ...association, productId: 9 };
    couponProductsService.update.mockResolvedValue(updated);

    await expect(controller.update(4, 8, updateDto)).resolves.toEqual(updated);
    expect(couponProductsService.update).toHaveBeenCalledWith(4, 8, updateDto);
  });

  it('should pass composite keys to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover a associação entre cupom e produto',
    );
    couponProductsService.remove.mockRejectedValue(error);

    await expect(controller.remove(4, 8)).rejects.toBe(error);
    expect(couponProductsService.remove).toHaveBeenCalledWith(4, 8);
  });
});
