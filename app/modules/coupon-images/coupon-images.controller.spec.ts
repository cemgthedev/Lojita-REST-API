jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { CouponImage } from '@/entities/coupon-image.entity';
import { CreateCouponImageDto } from '@/modules/coupon-images/dto/create-coupon-image.dto';
import { QueryCouponImageDto } from '@/modules/coupon-images/dto/query-coupon-image.dto';
import { UpdateCouponImageDto } from '@/modules/coupon-images/dto/update-coupon-image.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CouponImagesController } from './coupon-images.controller';
import { CouponImagesService } from './coupon-images.service';

type CouponImagesServiceMock = jest.Mocked<
  Pick<
    CouponImagesService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('CouponImagesController', () => {
  let controller: CouponImagesController;
  let couponImagesService: CouponImagesServiceMock;

  const imageDto: CreateCouponImageDto = {
    url: 'https://example.com/coupon.png',
    sortOrder: 1,
    couponId: 4,
  };

  const image: CouponImage = {
    id: 2,
    ...imageDto,
    sortOrder: imageDto.sortOrder ?? 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    couponImagesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CouponImagesController],
      providers: [
        { provide: CouponImagesService, useValue: couponImagesService },
      ],
    }).compile();

    controller = moduleRef.get(CouponImagesController);
  });

  it('should pass image data to the service on create', async () => {
    couponImagesService.create.mockResolvedValue(image);

    await expect(controller.create(imageDto)).resolves.toEqual(image);
    expect(couponImagesService.create).toHaveBeenCalledWith(imageDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCouponImageDto = {
      couponId: 4,
      sortOrder: 1,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [image],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    couponImagesService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(couponImagesService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Imagem do cupom de id #99 não foi encontrada',
    );
    couponImagesService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(couponImagesService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateCouponImageDto = { sortOrder: 2 };
    const updated = { ...image, ...updateDto };
    couponImagesService.update.mockResolvedValue(updated);

    await expect(controller.update(image.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(couponImagesService.update).toHaveBeenCalledWith(
      image.id,
      updateDto,
    );
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover a imagem do cupom',
    );
    couponImagesService.remove.mockRejectedValue(error);

    await expect(controller.remove(image.id)).rejects.toBe(error);
    expect(couponImagesService.remove).toHaveBeenCalledWith(image.id);
  });
});
