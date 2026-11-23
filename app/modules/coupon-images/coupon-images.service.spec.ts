jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Coupon } from '@/entities/coupon.entity';
import { CouponImage } from '@/entities/coupon-image.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCouponImageDto } from './dto/create-coupon-image.dto';
import { QueryCouponImageDto } from './dto/query-coupon-image.dto';
import { CouponImagesService } from './coupon-images.service';

describe('CouponImagesService', () => {
  let service: CouponImagesService;
  let repository: jest.Mocked<Repository<CouponImage>>;
  let couponsService: jest.Mocked<Pick<CouponsService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<CouponImage>>;

  const coupon: Coupon = {
    id: 4,
    title: 'Desconto de verão',
    code: 'VERAO20',
    scopeType: COUPON_SCOPE_TYPE.PLATFORM,
    type: COUPON_TYPE.PERCENTAGE,
    value: '20',
    minPurchaseAmount: '0',
    status: STATUS.ACTIVE,
    startAt: new Date('2026-01-01'),
    endAt: new Date('2027-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const imageDto: CreateCouponImageDto = {
    url: 'https://example.com/coupon.png',
    sortOrder: 1,
    couponId: coupon.id,
  };

  const createImage = (): CouponImage => ({
    id: 2,
    ...imageDto,
    sortOrder: imageDto.sortOrder ?? 0,
    coupon,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<CouponImage>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CouponImage>>;

    couponsService = { findOne: jest.fn() };
    service = new CouponImagesService(
      repository,
      couponsService as unknown as CouponsService,
    );
  });

  describe('create', () => {
    it('should validate the coupon and create its image', async () => {
      const image = createImage();
      couponsService.findOne.mockResolvedValue(coupon);
      repository.create.mockReturnValue(image);
      repository.save.mockResolvedValue(image);

      await expect(service.create(imageDto)).resolves.toEqual(image);
      expect(couponsService.findOne).toHaveBeenCalledWith(imageDto.couponId);
      expect(repository.create).toHaveBeenCalledWith({
        ...imageDto,
        coupon,
      });
      expect(repository.save).toHaveBeenCalledWith(image);
    });

    it('should not create the image when the coupon does not exist', async () => {
      const error = new NotFoundException('Cupom de id #4 não foi encontrado');
      couponsService.findOne.mockRejectedValue(error);

      await expect(service.create(imageDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const image = createImage();
      const filters: QueryCouponImageDto = {
        couponId: coupon.id,
        url: 'coupon',
        sortOrder: 1,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[image], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [image],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('couponImage');
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'couponImage.couponId = :couponId',
        { couponId: coupon.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'couponImage.url ILIKE :url',
        { url: '%coupon%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'couponImage.sortOrder = :sortOrder',
        { sortOrder: 1 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCouponImageDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an image and load its coupon', async () => {
      const image = createImage();
      repository.findOne.mockResolvedValue(image);

      await expect(service.findOne(image.id)).resolves.toEqual(image);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: image.id },
        relations: { coupon: true },
      });
    });

    it('should throw not found when the image does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Imagem do cupom de id #99 não foi encontrada'),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed coupon and save the image', async () => {
      const existing = createImage();
      const nextCoupon = { ...coupon, id: 5 };
      const updateDto = { couponId: nextCoupon.id, sortOrder: 2 };
      const updated = {
        ...existing,
        ...updateDto,
        coupon: nextCoupon,
      };
      repository.findOne.mockResolvedValue(existing);
      couponsService.findOne.mockResolvedValue(nextCoupon);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(couponsService.findOne).toHaveBeenCalledWith(nextCoupon.id);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the image does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { url: 'https://example.com/new.png' }),
      ).rejects.toThrow(
        new NotFoundException('Imagem do cupom de id #99 não foi encontrada'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the image and return a success message', async () => {
      const image = createImage();
      repository.findOne.mockResolvedValue(image);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(image.id)).resolves.toBe(
        'Imagem do cupom removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(image.id);
    });

    it('should throw a conflict when the image is not deleted', async () => {
      const image = createImage();
      repository.findOne.mockResolvedValue(image);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(image.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a imagem do cupom'),
      );
    });
  });
});
