jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Coupon } from '@/entities/coupon.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { CreateCouponDto } from '@/modules/coupons/dto/create-coupon.dto';
import { QueryCouponDto } from '@/modules/coupons/dto/query-coupon.dto';
import { UpdateCouponDto } from '@/modules/coupons/dto/update-coupon.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

type CouponsServiceMock = jest.Mocked<
  Pick<CouponsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('CouponsController', () => {
  let controller: CouponsController;
  let couponsService: CouponsServiceMock;

  const couponDto: CreateCouponDto = {
    title: 'Desconto de verão',
    code: 'VERAO20',
    scopeType: COUPON_SCOPE_TYPE.PLATFORM,
    type: COUPON_TYPE.PERCENTAGE,
    value: 20,
    startAt: new Date('2026-01-01'),
    endAt: new Date('2027-01-01'),
  };

  const coupon: Coupon = {
    id: 1,
    ...couponDto,
    value: '20',
    minPurchaseAmount: '0',
    status: STATUS.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    couponsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [{ provide: CouponsService, useValue: couponsService }],
    }).compile();

    controller = moduleRef.get(CouponsController);
  });

  it('should pass coupon data to the service on create', async () => {
    couponsService.create.mockResolvedValue(coupon);

    await expect(controller.create(couponDto)).resolves.toEqual(coupon);
    expect(couponsService.create).toHaveBeenCalledWith(couponDto);
  });

  it('should propagate coupon validation errors', async () => {
    const error = new BadRequestException('Invalid coupon');
    couponsService.create.mockRejectedValue(error);

    await expect(controller.create(couponDto)).rejects.toBe(error);
  });

  it('should pass query filters to the service', async () => {
    const query: QueryCouponDto = { code: 'VERAO', limit: 10, page: 1 };
    const result = {
      data: [coupon],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    couponsService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(couponsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass the id to findOne and propagate not found', async () => {
    const error = new NotFoundException('Cupom de id #99 não foi encontrado');
    couponsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(couponsService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass the id and update data to the service', async () => {
    const updateDto: UpdateCouponDto = { title: 'Novo título' };
    const updated = { ...coupon, title: updateDto.title! };
    couponsService.update.mockResolvedValue(updated);

    await expect(controller.update(coupon.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(couponsService.update).toHaveBeenCalledWith(coupon.id, updateDto);
  });

  it('should pass the id to remove and propagate conflicts', async () => {
    const error = new ConflictException('Não foi possível remover o cupom');
    couponsService.remove.mockRejectedValue(error);

    await expect(controller.remove(coupon.id)).rejects.toBe(error);
    expect(couponsService.remove).toHaveBeenCalledWith(coupon.id);
  });
});
