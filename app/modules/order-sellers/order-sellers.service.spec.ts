jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { Order } from '@/entities/order.entity';
import { OrderSeller } from '@/entities/order-seller.entity';
import { Store } from '@/entities/store.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import { CreateOrderSellerDto } from '@/modules/order-sellers/dto/create-order-seller.dto';
import { QueryOrderSellerDto } from '@/modules/order-sellers/dto/query-order-seller.dto';
import { StoresService } from '@/modules/stores/stores.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { OrderSellersService } from './order-sellers.service';

describe('OrderSellersService', () => {
  let service: OrderSellersService;
  let repository: jest.Mocked<Repository<OrderSeller>>;
  let ordersService: jest.Mocked<OrdersService>;
  let storesService: jest.Mocked<StoresService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<OrderSeller>>;

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

  const order: Order = {
    id: 9,
    status: ORDER_STATUS.PENDING,
    subtotal: '100',
    shippingTotal: '20',
    discountTotal: '5',
    total: '115',
    userId: 3,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const store: Store = {
    id: 7,
    name: 'My Store',
    nickname: 'my-store',
    phoneNumber: '+5511999999999',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createOrderSeller = (): OrderSeller => ({
    id: 1,
    ...orderSellerDto,
    status: ORDER_STATUS.PENDING,
    subtotal: '100',
    total: '115',
    shippingTotal: '20',
    discountTotal: '5',
    sortOrder: 1,
    order,
    store,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<OrderSeller>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderSeller>>;

    ordersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;
    storesService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<StoresService>;

    service = new OrderSellersService(repository, ordersService, storesService);
  });

  describe('create', () => {
    it('should validate related records and normalize seller totals', async () => {
      const orderSeller = createOrderSeller();
      ordersService.findOne.mockResolvedValue(order);
      storesService.findOne.mockResolvedValue(store);
      repository.create.mockReturnValue(orderSeller);
      repository.save.mockResolvedValue(orderSeller);

      await expect(service.create(orderSellerDto)).resolves.toEqual(
        orderSeller,
      );
      expect(ordersService.findOne).toHaveBeenCalledWith(
        orderSellerDto.orderId,
      );
      expect(storesService.findOne).toHaveBeenCalledWith(
        orderSellerDto.storeId,
      );
      expect(repository.create).toHaveBeenCalledWith({
        ...orderSellerDto,
        subtotal: '100',
        total: '115',
        shippingTotal: '20',
        discountTotal: '5',
      });
      expect(repository.save).toHaveBeenCalledWith(orderSeller);
    });

    it('should not create the seller when a related order does not exist', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      ordersService.findOne.mockRejectedValue(error);

      await expect(service.create(orderSellerDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const orderSeller = createOrderSeller();
      const filters: QueryOrderSellerDto = {
        status: ORDER_STATUS.PENDING,
        orderId: 9,
        storeId: 7,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[orderSeller], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [orderSeller],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('orderSeller');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'orderSeller.order',
        'order',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'orderSeller.store',
        'store',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'orderSeller.status = :status',
        { status: ORDER_STATUS.PENDING },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'orderSeller.orderId = :orderId',
        { orderId: 9 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'orderSeller.storeId = :storeId',
        { storeId: 7 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryOrderSellerDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find an order seller and load its relations', async () => {
      const orderSeller = createOrderSeller();
      repository.findOne.mockResolvedValue(orderSeller);

      await expect(service.findOne(orderSeller.id)).resolves.toEqual(
        orderSeller,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: orderSeller.id },
        relations: { order: true, store: true },
      });
    });

    it('should throw not found when the order seller does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Vendedor do pedido de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed relations and update normalized values', async () => {
      const existing = createOrderSeller();
      const newOrder = { ...order, id: 10 };
      const newStore = { ...store, id: 8 };
      const updateDto = {
        orderId: 10,
        storeId: 8,
        total: 125,
        sortOrder: 2,
      };
      const updated = {
        ...existing,
        ...updateDto,
        total: '125',
        order: newOrder,
        store: newStore,
      };
      repository.findOne.mockResolvedValue(existing);
      ordersService.findOne.mockResolvedValue(newOrder);
      storesService.findOne.mockResolvedValue(newStore);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(ordersService.findOne).toHaveBeenCalledWith(10);
      expect(storesService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the seller does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { total: 125 })).rejects.toThrow(
        new NotFoundException(
          'Vendedor do pedido de id #99 não foi encontrado',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the order seller and return a success message', async () => {
      const orderSeller = createOrderSeller();
      repository.findOne.mockResolvedValue(orderSeller);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(orderSeller.id)).resolves.toBe(
        'Vendedor do pedido removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(orderSeller.id);
    });

    it('should throw not found when the order seller does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Vendedor do pedido de id #99 não foi encontrado',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the order seller is not deleted', async () => {
      const orderSeller = createOrderSeller();
      repository.findOne.mockResolvedValue(orderSeller);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(orderSeller.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o vendedor do pedido'),
      );
    });
  });
});
