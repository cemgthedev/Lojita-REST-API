jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Order } from '@/entities/order.entity';
import { OrderItem } from '@/entities/order-item.entity';
import { User } from '@/entities/user.entity';
import { Variant } from '@/entities/variant.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { CreateOrderItemDto } from '@/modules/order-items/dto/create-order-item.dto';
import { QueryOrderItemDto } from '@/modules/order-items/dto/query-order-item.dto';
import { UsersService } from '@/modules/users/users.service';
import { Role } from '@/modules/users/enums/role.enum';
import { VariantsService } from '@/modules/variants/variants.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { OrderItemsService } from './order-items.service';

describe('OrderItemsService', () => {
  let service: OrderItemsService;
  let repository: jest.Mocked<Repository<OrderItem>>;
  let ordersService: jest.Mocked<OrdersService>;
  let variantsService: jest.Mocked<VariantsService>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<OrderItem>>;

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

  const order: Order = {
    id: 9,
    status: ORDER_STATUS.PENDING,
    subtotal: '51',
    shippingTotal: '0',
    discountTotal: '0',
    total: '51',
    userId: 4,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const variant: Variant = {
    id: 3,
    price: 25.5,
    stock: 5,
    status: STATUS.ACTIVE,
    productId: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const seller: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.SELLER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createOrderItem = (): OrderItem => ({
    id: 1,
    ...orderItemDto,
    unitPrice: '25.5',
    subtotal: '51',
    order,
    variant,
    orderSeller: seller,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<OrderItem>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderItem>>;

    ordersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;
    variantsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<VariantsService>;
    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new OrderItemsService(
      repository,
      ordersService,
      variantsService,
      usersService,
    );
  });

  describe('create', () => {
    it('should validate references and normalize item prices', async () => {
      const item = createOrderItem();
      ordersService.findOne.mockResolvedValue(order);
      variantsService.findOne.mockResolvedValue(variant);
      usersService.findOne.mockResolvedValue(seller);
      repository.create.mockReturnValue(item);
      repository.save.mockResolvedValue(item);

      await expect(service.create(orderItemDto)).resolves.toEqual(item);
      expect(ordersService.findOne).toHaveBeenCalledWith(orderItemDto.orderId);
      expect(variantsService.findOne).toHaveBeenCalledWith(
        orderItemDto.variantId,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(
        orderItemDto.orderSellerId,
      );
      expect(repository.create).toHaveBeenCalledWith({
        ...orderItemDto,
        unitPrice: '25.5',
        subtotal: '51',
      });
      expect(repository.save).toHaveBeenCalledWith(item);
    });

    it('should not create the item when a related order does not exist', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      ordersService.findOne.mockRejectedValue(error);

      await expect(service.create(orderItemDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const item = createOrderItem();
      const filters: QueryOrderItemDto = {
        orderId: 9,
        variantId: 3,
        orderSellerId: 7,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[item], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [item],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('orderItem');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'orderItem.order',
        'order',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'orderItem.variant',
        'variant',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        3,
        'orderItem.orderSeller',
        'orderSeller',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'orderItem.orderId = :orderId',
        { orderId: 9 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'orderItem.variantId = :variantId',
        { variantId: 3 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'orderItem.orderSellerId = :orderSellerId',
        { orderSellerId: 7 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryOrderItemDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an order item and load its relations', async () => {
      const item = createOrderItem();
      repository.findOne.mockResolvedValue(item);

      await expect(service.findOne(item.id)).resolves.toEqual(item);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: item.id },
        relations: { order: true, variant: true, orderSeller: true },
      });
    });

    it('should throw not found when the order item does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Item do pedido de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the order item', async () => {
      const existing = createOrderItem();
      const newOrder = { ...order, id: 10 };
      const newVariant = { ...variant, id: 4 };
      const newSeller = { ...seller, id: 8 };
      const updateDto = {
        orderId: 10,
        variantId: 4,
        orderSellerId: 8,
        quantity: 3,
        unitPrice: 30,
        subtotal: 90,
      };
      const updated = {
        ...existing,
        ...updateDto,
        unitPrice: '30',
        subtotal: '90',
        order: newOrder,
        variant: newVariant,
        orderSeller: newSeller,
      };
      repository.findOne.mockResolvedValue(existing);
      ordersService.findOne.mockResolvedValue(newOrder);
      variantsService.findOne.mockResolvedValue(newVariant);
      usersService.findOne.mockResolvedValue(newSeller);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(ordersService.findOne).toHaveBeenCalledWith(10);
      expect(variantsService.findOne).toHaveBeenCalledWith(4);
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the order item does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { quantity: 3 })).rejects.toThrow(
        new NotFoundException('Item do pedido de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the order item and return a success message', async () => {
      const item = createOrderItem();
      repository.findOne.mockResolvedValue(item);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(item.id)).resolves.toBe(
        'Item do pedido removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(item.id);
    });

    it('should throw not found when the order item does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Item do pedido de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the order item is not deleted', async () => {
      const item = createOrderItem();
      repository.findOne.mockResolvedValue(item);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(item.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o item do pedido'),
      );
    });
  });
});
