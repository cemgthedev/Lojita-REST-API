jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { OrderItem } from '@/entities/order-item.entity';
import { CreateOrderItemDto } from '@/modules/order-items/dto/create-order-item.dto';
import { QueryOrderItemDto } from '@/modules/order-items/dto/query-order-item.dto';
import { UpdateOrderItemDto } from '@/modules/order-items/dto/update-order-item.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderItemsController } from './order-items.controller';
import { OrderItemsService } from './order-items.service';

type OrderItemsServiceMock = jest.Mocked<
  Pick<OrderItemsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('OrderItemsController', () => {
  let controller: OrderItemsController;
  let orderItemsService: OrderItemsServiceMock;

  const orderItemDto: CreateOrderItemDto = {
    quantity: 2,
    unitPrice: 25.5,
    productName: 'T-shirt',
    sku: 'SHIRT-BLUE-M',
    subtotal: 51,
    orderId: 9,
    variantId: 3,
    orderSellerId: 7,
  };

  const orderItem: OrderItem = {
    id: 1,
    ...orderItemDto,
    unitPrice: '25.5',
    subtotal: '51',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    orderItemsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrderItemsController],
      providers: [{ provide: OrderItemsService, useValue: orderItemsService }],
    }).compile();

    controller = moduleRef.get(OrderItemsController);
  });

  describe('create', () => {
    it('should pass the item data to the service and return the created item', async () => {
      orderItemsService.create.mockResolvedValue(orderItem);

      await expect(controller.create(orderItemDto)).resolves.toEqual(orderItem);
      expect(orderItemsService.create).toHaveBeenCalledWith(orderItemDto);
    });

    it('should propagate not found when a related record does not exist', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      orderItemsService.create.mockRejectedValue(error);

      await expect(controller.create(orderItemDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching items', async () => {
      const query: QueryOrderItemDto = {
        orderId: 9,
        variantId: 3,
        orderSellerId: 7,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [orderItem],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      orderItemsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(orderItemsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar itens dos pedidos');
      orderItemsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryOrderItemDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the item id to the service and return the item', async () => {
      orderItemsService.findOne.mockResolvedValue(orderItem);

      await expect(controller.findOne(orderItem.id)).resolves.toEqual(
        orderItem,
      );
      expect(orderItemsService.findOne).toHaveBeenCalledWith(orderItem.id);
    });

    it('should propagate not found when the item does not exist', async () => {
      const error = new NotFoundException(
        'Item do pedido de id #99 não foi encontrado',
      );
      orderItemsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the item id and update data to the service', async () => {
      const updateDto: UpdateOrderItemDto = { quantity: 3 };
      const updated: OrderItem = {
        ...orderItem,
        ...updateDto,
        unitPrice: orderItem.unitPrice,
        subtotal: orderItem.subtotal,
      };
      orderItemsService.update.mockResolvedValue(updated);

      await expect(controller.update(orderItem.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(orderItemsService.update).toHaveBeenCalledWith(
        orderItem.id,
        updateDto,
      );
    });

    it('should propagate not found when the item does not exist', async () => {
      const error = new NotFoundException(
        'Item do pedido de id #99 não foi encontrado',
      );
      orderItemsService.update.mockRejectedValue(error);

      await expect(controller.update(99, { quantity: 3 })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the item id and return the service result', async () => {
      orderItemsService.remove.mockResolvedValue(
        'Item do pedido removido com sucesso',
      );

      await expect(controller.remove(orderItem.id)).resolves.toBe(
        'Item do pedido removido com sucesso',
      );
      expect(orderItemsService.remove).toHaveBeenCalledWith(orderItem.id);
    });

    it('should propagate not found when the item does not exist', async () => {
      const error = new NotFoundException(
        'Item do pedido de id #99 não foi encontrado',
      );
      orderItemsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the item cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o item do pedido',
      );
      orderItemsService.remove.mockRejectedValue(error);

      await expect(controller.remove(orderItem.id)).rejects.toBe(error);
    });
  });
});
