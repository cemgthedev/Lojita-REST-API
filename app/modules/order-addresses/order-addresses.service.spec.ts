jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Order } from '@/entities/order.entity';
import { OrderAddress } from '@/entities/order-address.entity';
import { CreateOrderAddressDto } from '@/modules/order-addresses/dto/create-order-address.dto';
import { QueryOrderAddressDto } from '@/modules/order-addresses/dto/query-order-address.dto';
import { OrdersService } from '@/modules/orders/orders.service';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { OrderAddressesService } from './order-addresses.service';

describe('OrderAddressesService', () => {
  let service: OrderAddressesService;
  let repository: jest.Mocked<Repository<OrderAddress>>;
  let ordersService: jest.Mocked<OrdersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<OrderAddress>>;

  const orderAddressDto: CreateOrderAddressDto = {
    name: 'Entrega',
    type: TYPE_ADDRESS.HOME,
    cep: '12345-678',
    street: 'Rua das Flores',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Centro',
    number: '123',
    complement: 'Apto 4',
    recipientName: 'Ana Silva',
    orderId: 9,
  };

  const order: Order = {
    id: 9,
    status: ORDER_STATUS.PENDING,
    subtotal: '100',
    shippingTotal: '0',
    discountTotal: '0',
    total: '100',
    userId: 3,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createOrderAddress = (): OrderAddress => ({
    id: 1,
    ...orderAddressDto,
    type: TYPE_ADDRESS.HOME,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<OrderAddress>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderAddress>>;

    ordersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;

    service = new OrderAddressesService(repository, ordersService);
  });

  describe('create', () => {
    it('should validate the order and create its address', async () => {
      const address = createOrderAddress();
      ordersService.findOne.mockResolvedValue(order);
      repository.create.mockReturnValue(address);
      repository.save.mockResolvedValue(address);

      await expect(service.create(orderAddressDto)).resolves.toEqual(address);
      expect(ordersService.findOne).toHaveBeenCalledWith(
        orderAddressDto.orderId,
      );
      expect(repository.create).toHaveBeenCalledWith(orderAddressDto);
      expect(repository.save).toHaveBeenCalledWith(address);
    });

    it('should not create the address when the order does not exist', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      ordersService.findOne.mockRejectedValue(error);

      await expect(service.create(orderAddressDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const address = createOrderAddress();
      const filters: QueryOrderAddressDto = {
        name: 'Entrega',
        type: TYPE_ADDRESS.HOME,
        cep: '12345',
        city: 'São',
        state: 'SP',
        orderId: 9,
        recipientName: 'Ana',
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[address], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [address],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'orderAddress',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'orderAddress.name ILIKE :name',
        { name: '%Entrega%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'orderAddress.type = :type',
        { type: TYPE_ADDRESS.HOME },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'orderAddress.cep ILIKE :cep',
        { cep: '%12345%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'orderAddress.city ILIKE :city',
        { city: '%São%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        5,
        'orderAddress.state ILIKE :state',
        { state: '%SP%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        6,
        'orderAddress.orderId = :orderId',
        { orderId: 9 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        7,
        'orderAddress.recipientName ILIKE :recipientName',
        { recipientName: '%Ana%' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryOrderAddressDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an order address and load its order', async () => {
      const address = createOrderAddress();
      repository.findOne.mockResolvedValue(address);

      await expect(service.findOne(address.id)).resolves.toEqual(address);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: address.id },
        relations: { order: true },
      });
    });

    it('should throw not found when the order address does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Endereço do pedido de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed order and update the address', async () => {
      const existing = createOrderAddress();
      const newOrder = { ...order, id: 10 };
      const updateDto = { orderId: 10, recipientName: 'João Silva' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      ordersService.findOne.mockResolvedValue(newOrder);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(ordersService.findOne).toHaveBeenCalledWith(10);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 10 }),
      );
    });

    it('should not save when the order address does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { recipientName: 'João Silva' }),
      ).rejects.toThrow(
        new NotFoundException(
          'Endereço do pedido de id #99 não foi encontrado',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(ordersService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the address and return a success message', async () => {
      const address = createOrderAddress();
      repository.findOne.mockResolvedValue(address);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(address.id)).resolves.toBe(
        'Endereço do pedido removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(address.id);
    });

    it('should throw not found when the order address does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Endereço do pedido de id #99 não foi encontrado',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the address is not deleted', async () => {
      const address = createOrderAddress();
      repository.findOne.mockResolvedValue(address);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(address.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o endereço do pedido'),
      );
    });
  });
});
