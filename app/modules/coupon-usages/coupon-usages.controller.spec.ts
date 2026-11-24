jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { CouponUsage } from '@/entities/coupon-usage.entity';
import { CreateCouponUsageDto } from '@/modules/coupon-usages/dto/create-coupon-usage.dto';
import { QueryCouponUsageDto } from '@/modules/coupon-usages/dto/query-coupon-usage.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CouponUsagesController } from './coupon-usages.controller';
import { CouponUsagesService } from './coupon-usages.service';

type CouponUsagesServiceMock = jest.Mocked<
  Pick<CouponUsagesService, 'create' | 'query' | 'findOne' | 'remove'>
>;

describe('CouponUsagesController', () => {
  let controller: CouponUsagesController;
  let couponUsagesService: CouponUsagesServiceMock;

  const usageDto: CreateCouponUsageDto = {
    userId: 7,
    couponId: 4,
    orderId: 9,
  };

  const usage: CouponUsage = {
    ...usageDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    couponUsagesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CouponUsagesController],
      providers: [
        { provide: CouponUsagesService, useValue: couponUsagesService },
      ],
    }).compile();

    controller = moduleRef.get(CouponUsagesController);
  });

  it('should pass usage data to the service on create', async () => {
    couponUsagesService.create.mockResolvedValue(usage);

    await expect(controller.create(usageDto)).resolves.toEqual(usage);
    expect(couponUsagesService.create).toHaveBeenCalledWith(usageDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCouponUsageDto = {
      userId: 7,
      couponId: 4,
      orderId: 9,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [usage],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    couponUsagesService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(couponUsagesService.query).toHaveBeenCalledWith(query);
  });

  it('should pass the composite key to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Registro de uso do cupom não foi encontrado',
    );
    couponUsagesService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(7, 4, 9)).rejects.toBe(error);
    expect(couponUsagesService.findOne).toHaveBeenCalledWith(7, 4, 9);
  });

  it('should pass the composite key to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover o registro de uso do cupom',
    );
    couponUsagesService.remove.mockRejectedValue(error);

    await expect(controller.remove(7, 4, 9)).rejects.toBe(error);
    expect(couponUsagesService.remove).toHaveBeenCalledWith(7, 4, 9);
  });
});
