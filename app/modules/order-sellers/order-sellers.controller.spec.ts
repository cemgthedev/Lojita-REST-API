jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { OrderSeller } from '@/entities/order-seller.entity';
import { CreateOrderSellerDto } from '@/modules/order-sellers/dto/create-order-seller.dto';
import { QueryOrderSellerDto } from '@/modules/order-sellers/dto/query-order-seller.dto';
import { UpdateOrderSellerDto } from '@/modules/order-sellers/dto/update-order-seller.dto';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderSellersController } from './order-sellers.controller';
import { OrderSellersService } from './order-sellers.service';

type OrderSellersServiceMock = jest.Mocked<
  Pick<
    OrderSellersService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('OrderSellersController', () => {
  let controller: OrderSellersController;
  let orderSellersService: OrderSellersServiceMock;

  const orderSellerDto: CreateOrderSellerDto = {
    status: ORDER_STATUS.PENDING,
    subtotal: 100,
    total: 115,
    shippingTotal: 20,
    discountTotal: 5,
    storeId: 7,
    orderId: 9,
    sortOrder: 1,
  };

  const orderSeller: OrderSeller = {
    id: 1,
    ...orderSellerDto,
    status: ORDER_STATUS.PENDING,
    subtotal: '100',
    total: '115',
    shippingTotal: '20',
    discountTotal: '5',
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    orderSellersService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrderSellersController],
      providers: [
        { provide: OrderSellersService, useValue: orderSellersService },
      ],
    }).compile();

    controller = moduleRef.get(OrderSellersController);
  });

  describe('create', () => {
    it('should pass the seller data to the service and return the association', async () => {
      orderSellersService.create.mockResolvedValue(orderSeller);

      await expect(controller.create(orderSellerDto)).resolves.toEqual(
        orderSeller,
      );
      expect(orderSellersService.create).toHaveBeenCalledWith(orderSellerDto);
    });

    it('should propagate not found when a related record does not exist', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      orderSellersService.create.mockRejectedValue(error);

      await expect(controller.create(orderSellerDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching sellers', async () => {
      const query: QueryOrderSellerDto = {
        status: ORDER_STATUS.PENDING,
        orderId: 9,
        storeId: 7,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [orderSeller],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      orderSellersService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(orderSellersService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar vendedores dos pedidos');
      orderSellersService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryOrderSellerDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the association id to the service', async () => {
      orderSellersService.findOne.mockResolvedValue(orderSeller);

      await expect(controller.findOne(orderSeller.id)).resolves.toEqual(
        orderSeller,
      );
      expect(orderSellersService.findOne).toHaveBeenCalledWith(orderSeller.id);
    });

    it('should propagate not found when the association does not exist', async () => {
      const error = new NotFoundException(
        'Vendedor do pedido de id #99 não foi encontrado',
      );
      orderSellersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the association id and update data to the service', async () => {
      const updateDto: UpdateOrderSellerDto = { sortOrder: 2 };
      const updated: OrderSeller = {
        ...orderSeller,
        ...updateDto,
        subtotal: orderSeller.subtotal,
        total: orderSeller.total,
        shippingTotal: orderSeller.shippingTotal,
        discountTotal: orderSeller.discountTotal,
      };
      orderSellersService.update.mockResolvedValue(updated);

      await expect(
        controller.update(orderSeller.id, updateDto),
      ).resolves.toEqual(updated);
      expect(orderSellersService.update).toHaveBeenCalledWith(
        orderSeller.id,
        updateDto,
      );
    });

    it('should propagate not found when the association does not exist', async () => {
      const error = new NotFoundException(
        'Vendedor do pedido de id #99 não foi encontrado',
      );
      orderSellersService.update.mockRejectedValue(error);

      await expect(controller.update(99, { sortOrder: 2 })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the association id and return the service result', async () => {
      orderSellersService.remove.mockResolvedValue(
        'Vendedor do pedido removido com sucesso',
      );

      await expect(controller.remove(orderSeller.id)).resolves.toBe(
        'Vendedor do pedido removido com sucesso',
      );
      expect(orderSellersService.remove).toHaveBeenCalledWith(orderSeller.id);
    });

    it('should propagate not found when the association does not exist', async () => {
      const error = new NotFoundException(
        'Vendedor do pedido de id #99 não foi encontrado',
      );
      orderSellersService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the association cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o vendedor do pedido',
      );
      orderSellersService.remove.mockRejectedValue(error);

      await expect(controller.remove(orderSeller.id)).rejects.toBe(error);
    });
  });
});
