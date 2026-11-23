jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Coupon } from '@/entities/coupon.entity';
import { Store } from '@/entities/store.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { StoresService } from '@/modules/stores/stores.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { CouponsService } from './coupons.service';

describe('CouponsService', () => {
  let service: CouponsService;
  let repository: jest.Mocked<Repository<Coupon>>;
  let storesService: jest.Mocked<Pick<StoresService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Coupon>>;

  const store: Store = {
    id: 2,
    name: 'Minha loja',
    nickname: 'minha-loja',
    phoneNumber: '+5511999999999',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const couponDto: CreateCouponDto = {
    title: 'Desconto de verão',
    code: 'VERAO20',
    description: 'Desconto especial',
    scopeType: COUPON_SCOPE_TYPE.PLATFORM,
    type: COUPON_TYPE.PERCENTAGE,
    value: 20,
    minPurchaseAmount: 50,
    usageLimit: 100,
    usageLimitPerUser: 2,
    status: STATUS.ACTIVE,
    startAt: new Date('2026-01-01'),
    endAt: new Date('2027-01-01'),
  };

  const createCoupon = (): Coupon => ({
    id: 1,
    ...couponDto,
    value: '20',
    minPurchaseAmount: '50',
    status: STATUS.ACTIVE,
    store,
    storeId: store.id,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<Coupon>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Coupon>>;

    storesService = {
      findOne: jest.fn(),
    };

    service = new CouponsService(
      repository,
      storesService as unknown as StoresService,
    );
  });

  describe('create', () => {
    it('should validate the store, normalize decimal values, and create the coupon', async () => {
      const storeCouponDto = { ...couponDto, storeId: store.id };
      const coupon = createCoupon();
      storesService.findOne.mockResolvedValue(store);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(coupon);
      repository.save.mockResolvedValue(coupon);

      await expect(service.create(storeCouponDto)).resolves.toEqual(coupon);
      expect(storesService.findOne).toHaveBeenCalledWith(store.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: couponDto.code },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...storeCouponDto,
        value: '20',
        minPurchaseAmount: '50',
        store,
      });
      expect(repository.save).toHaveBeenCalledWith(coupon);
    });

    it('should reject a store-scoped coupon without a store', async () => {
      const dto = {
        ...couponDto,
        scopeType: COUPON_SCOPE_TYPE.STORE,
      };

      await expect(service.create(dto)).rejects.toThrow(
        new BadRequestException(
          'Cupons com escopo de loja devem informar uma loja',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject an invalid date interval', async () => {
      await expect(
        service.create({
          ...couponDto,
          startAt: new Date('2026-02-01'),
          endAt: new Date('2026-02-01'),
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'A data de início do cupom deve ser anterior à data de término',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject percentage values greater than 100', async () => {
      await expect(
        service.create({ ...couponDto, value: 101 }),
      ).rejects.toThrow(
        new BadRequestException(
          'O valor de um cupom percentual não pode exceder 100',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject a code that is already in use', async () => {
      repository.findOne.mockResolvedValue(createCoupon());

      await expect(service.create(couponDto)).rejects.toThrow(
        new ConflictException(
          `O código de cupom '${couponDto.code}' já foi usado`,
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join the store, apply filters, and return pagination metadata', async () => {
      const coupon = createCoupon();
      const filters: QueryCouponDto = {
        title: 'verão',
        code: 'VERAO',
        scopeType: COUPON_SCOPE_TYPE.PLATFORM,
        type: COUPON_TYPE.PERCENTAGE,
        status: STATUS.ACTIVE,
        storeId: store.id,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[coupon], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [coupon],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('coupon');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'coupon.store',
        'store',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'coupon.title ILIKE :title',
        { title: '%verão%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'coupon.code ILIKE :code',
        { code: '%VERAO%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'coupon.scopeType = :scopeType',
        { scopeType: COUPON_SCOPE_TYPE.PLATFORM },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'coupon.type = :type',
        { type: COUPON_TYPE.PERCENTAGE },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        5,
        'coupon.status = :status',
        { status: STATUS.ACTIVE },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        6,
        'coupon.storeId = :storeId',
        { storeId: store.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCouponDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a coupon and load its store', async () => {
      const coupon = createCoupon();
      repository.findOne.mockResolvedValue(coupon);

      await expect(service.findOne(coupon.id)).resolves.toEqual(coupon);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: coupon.id },
        relations: { store: true },
      });
    });

    it('should throw not found when the coupon does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Cupom de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate changed fields and save the updated coupon', async () => {
      const existing = createCoupon();
      const updatedStore = { ...store, id: 3 };
      const updateDto = {
        title: 'Novo título',
        code: 'NOVO20',
        value: 15,
        storeId: updatedStore.id,
      };
      const updated = {
        ...existing,
        ...updateDto,
        value: '15',
        store: updatedStore,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      storesService.findOne.mockResolvedValue(updatedStore);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(storesService.findOne).toHaveBeenCalledWith(updatedStore.id);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { code: updateDto.code },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update that makes the coupon invalid', async () => {
      const existing = createCoupon();
      repository.findOne.mockResolvedValue(existing);

      await expect(service.update(existing.id, { value: 101 })).rejects.toThrow(
        new BadRequestException(
          'O valor de um cupom percentual não pode exceder 100',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the coupon does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { title: 'Novo título' }),
      ).rejects.toThrow(
        new NotFoundException('Cupom de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the coupon and return a success message', async () => {
      const coupon = createCoupon();
      repository.findOne.mockResolvedValue(coupon);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(coupon.id)).resolves.toBe(
        'Cupom removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(coupon.id);
    });

    it('should throw not found when the coupon does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Cupom de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the coupon is not deleted', async () => {
      const coupon = createCoupon();
      repository.findOne.mockResolvedValue(coupon);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(coupon.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o cupom'),
      );
    });
  });
});
