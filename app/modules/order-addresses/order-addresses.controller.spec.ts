jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { OrderAddress } from '@/entities/order-address.entity';
import { CreateOrderAddressDto } from '@/modules/order-addresses/dto/create-order-address.dto';
import { QueryOrderAddressDto } from '@/modules/order-addresses/dto/query-order-address.dto';
import { UpdateOrderAddressDto } from '@/modules/order-addresses/dto/update-order-address.dto';
import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderAddressesController } from './order-addresses.controller';
import { OrderAddressesService } from './order-addresses.service';

type OrderAddressesServiceMock = jest.Mocked<
  Pick<
    OrderAddressesService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('OrderAddressesController', () => {
  let controller: OrderAddressesController;
  let orderAddressesService: OrderAddressesServiceMock;

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

  const orderAddress: OrderAddress = {
    id: 1,
    ...orderAddressDto,
    type: TYPE_ADDRESS.HOME,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    orderAddressesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrderAddressesController],
      providers: [
        { provide: OrderAddressesService, useValue: orderAddressesService },
      ],
    }).compile();

    controller = moduleRef.get(OrderAddressesController);
  });

  describe('create', () => {
    it('should pass the address data to the service', async () => {
      orderAddressesService.create.mockResolvedValue(orderAddress);

      await expect(controller.create(orderAddressDto)).resolves.toEqual(
        orderAddress,
      );
      expect(orderAddressesService.create).toHaveBeenCalledWith(
        orderAddressDto,
      );
    });

    it('should propagate not found when the order does not exist', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      orderAddressesService.create.mockRejectedValue(error);

      await expect(controller.create(orderAddressDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching addresses', async () => {
      const query: QueryOrderAddressDto = {
        city: 'São Paulo',
        orderId: 9,
        recipientName: 'Ana',
        limit: 10,
        page: 1,
      };
      const result = {
        data: [orderAddress],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      orderAddressesService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(orderAddressesService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar endereços do pedido');
      orderAddressesService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryOrderAddressDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the address id to the service and return the address', async () => {
      orderAddressesService.findOne.mockResolvedValue(orderAddress);

      await expect(controller.findOne(orderAddress.id)).resolves.toEqual(
        orderAddress,
      );
      expect(orderAddressesService.findOne).toHaveBeenCalledWith(
        orderAddress.id,
      );
    });

    it('should propagate not found when the address does not exist', async () => {
      const error = new NotFoundException(
        'Endereço do pedido de id #99 não foi encontrado',
      );
      orderAddressesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the address id and update data to the service', async () => {
      const updateDto: UpdateOrderAddressDto = {
        recipientName: 'João Silva',
      };
      const updated = { ...orderAddress, ...updateDto };
      orderAddressesService.update.mockResolvedValue(updated);

      await expect(
        controller.update(orderAddress.id, updateDto),
      ).resolves.toEqual(updated);
      expect(orderAddressesService.update).toHaveBeenCalledWith(
        orderAddress.id,
        updateDto,
      );
    });

    it('should propagate not found when the address does not exist', async () => {
      const error = new NotFoundException(
        'Endereço do pedido de id #99 não foi encontrado',
      );
      orderAddressesService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { recipientName: 'João Silva' }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the address id to the service and return its result', async () => {
      orderAddressesService.remove.mockResolvedValue(
        'Endereço do pedido removido com sucesso',
      );

      await expect(controller.remove(orderAddress.id)).resolves.toBe(
        'Endereço do pedido removido com sucesso',
      );
      expect(orderAddressesService.remove).toHaveBeenCalledWith(
        orderAddress.id,
      );
    });

    it('should propagate not found when the address does not exist', async () => {
      const error = new NotFoundException(
        'Endereço do pedido de id #99 não foi encontrado',
      );
      orderAddressesService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the address cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o endereço do pedido',
      );
      orderAddressesService.remove.mockRejectedValue(error);

      await expect(controller.remove(orderAddress.id)).rejects.toBe(error);
    });
  });
});
