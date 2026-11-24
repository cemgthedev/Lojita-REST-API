jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Order } from '@/entities/order.entity';
import { User } from '@/entities/user.entity';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto';
import { QueryOrderDto } from '@/modules/orders/dto/query-order.dto';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: jest.Mocked<Repository<Order>>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Order>>;

  const orderDto: CreateOrderDto = {
    status: ORDER_STATUS.PENDING,
    subtotal: 100,
    shippingTotal: 10,
    discountTotal: 5,
    total: 105,
    userId: 7,
  };

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createOrder = (): Order => ({
    id: 1,
    ...orderDto,
    subtotal: '100',
    shippingTotal: '10',
    discountTotal: '5',
    total: '105',
    status: ORDER_STATUS.PENDING,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Order>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Order>>;

    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new OrdersService(repository, usersService);
  });

  describe('create', () => {
    it('should validate the user and create an order with normalized amounts', async () => {
      const order = createOrder();
      usersService.findOne.mockResolvedValue(user);
      repository.create.mockReturnValue(order);
      repository.save.mockResolvedValue(order);

      await expect(service.create(orderDto)).resolves.toEqual(order);
      expect(usersService.findOne).toHaveBeenCalledWith(orderDto.userId);
      expect(repository.create).toHaveBeenCalledWith({
        userId: 7,
        status: ORDER_STATUS.PENDING,
        subtotal: '100',
        shippingTotal: '10',
        discountTotal: '5',
        total: '105',
      });
      expect(repository.save).toHaveBeenCalledWith(order);
    });

    it('should not create the order when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(orderDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const order = createOrder();
      const filters: QueryOrderDto = {
        userId: 7,
        status: ORDER_STATUS.PENDING,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[order], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [order],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('orderEntity');
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'orderEntity.userId = :userId',
        { userId: 7 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'orderEntity.status = :status',
        { status: ORDER_STATUS.PENDING },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryOrderDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an order by id', async () => {
      const order = createOrder();
      repository.findOne.mockResolvedValue(order);

      await expect(service.findOne(order.id)).resolves.toEqual(order);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: order.id },
      });
    });

    it('should throw not found when the order does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Pedido de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed user and normalize updated amounts', async () => {
      const existing = createOrder();
      const updateDto = {
        userId: 8,
        status: ORDER_STATUS.CONFIRMED,
        total: 110,
      };
      const updated = {
        ...existing,
        ...updateDto,
        total: '110',
      };
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockResolvedValue({ ...user, id: 8 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the order does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { status: ORDER_STATUS.CONFIRMED }),
      ).rejects.toThrow(
        new NotFoundException('Pedido de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the changed user does not exist', async () => {
      const existing = createOrder();
      const error = new NotFoundException(
        'Usuário de id #8 não foi encontrado',
      );
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockRejectedValue(error);

      await expect(service.update(existing.id, { userId: 8 })).rejects.toBe(
        error,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the order and return a success message', async () => {
      const order = createOrder();
      repository.findOne.mockResolvedValue(order);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(order.id)).resolves.toBe(
        'Pedido removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(order.id);
    });

    it('should throw not found when the order does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Pedido de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the order is not deleted', async () => {
      const order = createOrder();
      repository.findOne.mockResolvedValue(order);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(order.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o pedido'),
      );
    });
  });
});
