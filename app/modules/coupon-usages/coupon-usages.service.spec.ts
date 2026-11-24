jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Coupon } from '@/entities/coupon.entity';
import { CouponUsage } from '@/entities/coupon-usage.entity';
import { Order } from '@/entities/order.entity';
import { User } from '@/entities/user.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { OrdersService } from '@/modules/orders/orders.service';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCouponUsageDto } from './dto/create-coupon-usage.dto';
import { QueryCouponUsageDto } from './dto/query-coupon-usage.dto';
import { CouponUsagesService } from './coupon-usages.service';

describe('CouponUsagesService', () => {
  let service: CouponUsagesService;
  let repository: jest.Mocked<Repository<CouponUsage>>;
  let couponsService: jest.Mocked<Pick<CouponsService, 'findOne'>>;
  let ordersService: jest.Mocked<Pick<OrdersService, 'findOne'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<CouponUsage>>;
  let couponRepository: jest.Mocked<Pick<Repository<Coupon>, 'findOne'>>;
  let transactionalUsageRepository: jest.Mocked<
    Pick<Repository<CouponUsage>, 'findOne' | 'count' | 'create' | 'save'>
  >;
  let transactionalEntityManager: EntityManager;

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const coupon: Coupon = {
    id: 4,
    title: 'Desconto de verão',
    code: 'VERAO20',
    scopeType: COUPON_SCOPE_TYPE.PLATFORM,
    type: COUPON_TYPE.PERCENTAGE,
    value: '20',
    minPurchaseAmount: '0',
    usageLimit: 10,
    usageLimitPerUser: 2,
    status: STATUS.ACTIVE,
    startAt: new Date('2020-01-01'),
    endAt: new Date('2099-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const order: Order = {
    id: 9,
    status: ORDER_STATUS.PENDING,
    subtotal: '100',
    shippingTotal: '0',
    discountTotal: '0',
    total: '100',
    userId: user.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const usageDto: CreateCouponUsageDto = {
    userId: user.id,
    couponId: coupon.id,
    orderId: order.id,
  };

  const createUsage = (): CouponUsage => ({
    ...usageDto,
    user,
    coupon,
    order,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<CouponUsage>>;

    couponRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Pick<Repository<Coupon>, 'findOne'>>;

    transactionalUsageRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<CouponUsage>, 'findOne' | 'count' | 'create' | 'save'>
    >;

    transactionalEntityManager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Coupon ? couponRepository : transactionalUsageRepository,
      ),
    } as unknown as EntityManager;

    const manager = {
      transaction: jest.fn(
        (callback: (manager: EntityManager) => Promise<CouponUsage>) =>
          callback(transactionalEntityManager),
      ),
    };

    repository = {
      manager,
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CouponUsage>>;

    couponsService = { findOne: jest.fn() };
    ordersService = { findOne: jest.fn() };
    usersService = { findOne: jest.fn() };
    service = new CouponUsagesService(
      repository,
      couponsService as unknown as CouponsService,
      ordersService as unknown as OrdersService,
      usersService as unknown as UsersService,
    );
  });

  describe('create', () => {
    const setupValidUsageTransaction = (usage = createUsage()) => {
      usersService.findOne.mockResolvedValue(user);
      couponsService.findOne.mockResolvedValue(coupon);
      ordersService.findOne.mockResolvedValue(order);
      couponRepository.findOne.mockResolvedValue(coupon);
      transactionalUsageRepository.findOne.mockResolvedValue(null);
      transactionalUsageRepository.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      transactionalUsageRepository.create.mockReturnValue(usage);
      transactionalUsageRepository.save.mockResolvedValue(usage);
      return usage;
    };

    it('should validate ownership, lock the coupon, enforce limits, and save usage', async () => {
      const usage = setupValidUsageTransaction();

      await expect(service.create(usageDto)).resolves.toEqual(usage);
      expect(usersService.findOne).toHaveBeenCalledWith(user.id);
      expect(couponsService.findOne).toHaveBeenCalledWith(coupon.id);
      expect(ordersService.findOne).toHaveBeenCalledWith(order.id);
      expect(couponRepository.findOne).toHaveBeenCalledWith({
        where: { id: coupon.id },
        lock: { mode: 'pessimistic_write' },
      });
      expect(transactionalUsageRepository.count).toHaveBeenNthCalledWith(1, {
        where: { couponId: coupon.id },
      });
      expect(transactionalUsageRepository.count).toHaveBeenNthCalledWith(2, {
        where: { couponId: coupon.id, userId: user.id },
      });
      expect(transactionalUsageRepository.create).toHaveBeenCalledWith({
        userId: user.id,
        couponId: coupon.id,
        orderId: order.id,
      });
      expect(transactionalUsageRepository.save).toHaveBeenCalledWith(usage);
    });

    it('should reject when the order belongs to another user', async () => {
      usersService.findOne.mockResolvedValue(user);
      couponsService.findOne.mockResolvedValue(coupon);
      ordersService.findOne.mockResolvedValue({ ...order, userId: 99 });

      await expect(service.create(usageDto)).rejects.toThrow(
        new BadRequestException('O pedido informado não pertence ao usuário'),
      );
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    it('should reject when the locked coupon no longer exists', async () => {
      usersService.findOne.mockResolvedValue(user);
      couponsService.findOne.mockResolvedValue(coupon);
      ordersService.findOne.mockResolvedValue(order);
      couponRepository.findOne.mockResolvedValue(null);

      await expect(service.create(usageDto)).rejects.toThrow(
        new NotFoundException('Cupom de id #4 não foi encontrado'),
      );
      expect(transactionalUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should reject usage of an inactive coupon', async () => {
      usersService.findOne.mockResolvedValue(user);
      couponsService.findOne.mockResolvedValue(coupon);
      ordersService.findOne.mockResolvedValue(order);
      couponRepository.findOne.mockResolvedValue({
        ...coupon,
        status: STATUS.INATIVE,
      });

      await expect(service.create(usageDto)).rejects.toThrow(
        new BadRequestException('O cupom não está ativo'),
      );
      expect(transactionalUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should reject when the same usage is already registered', async () => {
      usersService.findOne.mockResolvedValue(user);
      couponsService.findOne.mockResolvedValue(coupon);
      ordersService.findOne.mockResolvedValue(order);
      couponRepository.findOne.mockResolvedValue(coupon);
      transactionalUsageRepository.findOne.mockResolvedValue(createUsage());

      await expect(service.create(usageDto)).rejects.toThrow(
        new ConflictException(
          'Este cupom já foi registrado para o pedido informado',
        ),
      );
      expect(transactionalUsageRepository.count).not.toHaveBeenCalled();
    });

    it('should reject when the total usage limit has been reached', async () => {
      setupValidUsageTransaction();
      transactionalUsageRepository.count.mockReset().mockResolvedValue(10);

      await expect(service.create(usageDto)).rejects.toThrow(
        new ConflictException('O limite total de uso do cupom foi atingido'),
      );
      expect(transactionalUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should reject when the per-user usage limit has been reached', async () => {
      setupValidUsageTransaction();
      transactionalUsageRepository.count
        .mockReset()
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      await expect(service.create(usageDto)).rejects.toThrow(
        new ConflictException('O usuário atingiu o limite de uso deste cupom'),
      );
      expect(transactionalUsageRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const usage = createUsage();
      const filters: QueryCouponUsageDto = {
        userId: user.id,
        couponId: coupon.id,
        orderId: order.id,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[usage], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [usage],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'couponUsage.userId = :userId',
        { userId: user.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'couponUsage.couponId = :couponId',
        { couponId: coupon.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'couponUsage.orderId = :orderId',
        { orderId: order.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCouponUsageDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a usage by its composite key', async () => {
      const usage = createUsage();
      repository.findOne.mockResolvedValue(usage);

      await expect(
        service.findOne(user.id, coupon.id, order.id),
      ).resolves.toEqual(usage);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          userId: user.id,
          couponId: coupon.id,
          orderId: order.id,
        },
      });
    });

    it('should throw not found when the usage does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99, 99, 99)).rejects.toThrow(
        new NotFoundException('Registro de uso do cupom não foi encontrado'),
      );
    });
  });

  describe('remove', () => {
    it('should delete the usage and return a success message', async () => {
      repository.findOne.mockResolvedValue(createUsage());
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.remove(user.id, coupon.id, order.id)).resolves.toBe(
        'Registro de uso do cupom removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith({
        userId: user.id,
        couponId: coupon.id,
        orderId: order.id,
      });
    });

    it('should throw a conflict when the usage is not deleted', async () => {
      repository.findOne.mockResolvedValue(createUsage());
      repository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(
        service.remove(user.id, coupon.id, order.id),
      ).rejects.toThrow(
        new ConflictException(
          'Não foi possível remover o registro de uso do cupom',
        ),
      );
    });
  });
});
