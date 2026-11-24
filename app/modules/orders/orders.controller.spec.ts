jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Order } from '@/entities/order.entity';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto';
import { QueryOrderDto } from '@/modules/orders/dto/query-order.dto';
import { UpdateOrderDto } from '@/modules/orders/dto/update-order.dto';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

type OrdersServiceMock = jest.Mocked<
  Pick<OrdersService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersServiceMock;

  const orderDto: CreateOrderDto = {
    status: ORDER_STATUS.PENDING,
    subtotal: 100,
    shippingTotal: 10,
    discountTotal: 5,
    total: 105,
    userId: 7,
  };

  const order: Order = {
    id: 1,
    ...orderDto,
    status: ORDER_STATUS.PENDING,
    subtotal: '100',
    shippingTotal: '10',
    discountTotal: '5',
    total: '105',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    ordersService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = moduleRef.get(OrdersController);
  });

  describe('create', () => {
    it('should pass the order data to the service and return the order', async () => {
      ordersService.create.mockResolvedValue(order);

      await expect(controller.create(orderDto)).resolves.toEqual(order);
      expect(ordersService.create).toHaveBeenCalledWith(orderDto);
    });

    it('should propagate not found when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      ordersService.create.mockRejectedValue(error);

      await expect(controller.create(orderDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching orders', async () => {
      const query: QueryOrderDto = {
        userId: 7,
        status: ORDER_STATUS.PENDING,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [order],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      ordersService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(ordersService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar pedidos');
      ordersService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryOrderDto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the order id to the service and return the order', async () => {
      ordersService.findOne.mockResolvedValue(order);

      await expect(controller.findOne(order.id)).resolves.toEqual(order);
      expect(ordersService.findOne).toHaveBeenCalledWith(order.id);
    });

    it('should propagate not found when the order does not exist', async () => {
      const error = new NotFoundException(
        'Pedido de id #99 não foi encontrado',
      );
      ordersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the order id and update data to the service', async () => {
      const updateDto: UpdateOrderDto = {
        status: ORDER_STATUS.CONFIRMED,
      };
      const updated: Order = {
        ...order,
        ...updateDto,
        subtotal: order.subtotal,
        shippingTotal: order.shippingTotal,
        discountTotal: order.discountTotal,
        total: order.total,
      };
      ordersService.update.mockResolvedValue(updated);

      await expect(controller.update(order.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(ordersService.update).toHaveBeenCalledWith(order.id, updateDto);
    });

    it('should propagate not found when the order does not exist', async () => {
      const error = new NotFoundException(
        'Pedido de id #99 não foi encontrado',
      );
      ordersService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { status: ORDER_STATUS.CONFIRMED }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the order id and return the service result', async () => {
      ordersService.remove.mockResolvedValue('Pedido removido com sucesso');

      await expect(controller.remove(order.id)).resolves.toBe(
        'Pedido removido com sucesso',
      );
      expect(ordersService.remove).toHaveBeenCalledWith(order.id);
    });

    it('should propagate not found when the order does not exist', async () => {
      const error = new NotFoundException(
        'Pedido de id #99 não foi encontrado',
      );
      ordersService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the order cannot be deleted', async () => {
      const error = new ConflictException('Não foi possível remover o pedido');
      ordersService.remove.mockRejectedValue(error);

      await expect(controller.remove(order.id)).rejects.toBe(error);
    });
  });
});
