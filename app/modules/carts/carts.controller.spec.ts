jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Cart } from '@/entities/cart.entity';
import { CreateCartDto } from '@/modules/carts/dto/create-cart.dto';
import { QueryCartDto } from '@/modules/carts/dto/query-cart.dto';
import { UpdateCartDto } from '@/modules/carts/dto/update-cart.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

type CartsServiceMock = jest.Mocked<
  Pick<CartsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('CartsController', () => {
  let controller: CartsController;
  let cartsService: CartsServiceMock;

  const cartDto: CreateCartDto = { userId: 7 };

  const cart: Cart = {
    id: 5,
    ...cartDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    cartsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CartsController],
      providers: [{ provide: CartsService, useValue: cartsService }],
    }).compile();

    controller = moduleRef.get(CartsController);
  });

  it('should pass cart data to the service on create', async () => {
    cartsService.create.mockResolvedValue(cart);

    await expect(controller.create(cartDto)).resolves.toEqual(cart);
    expect(cartsService.create).toHaveBeenCalledWith(cartDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCartDto = { userId: 7, limit: 10, page: 1 };
    const result = {
      data: [cart],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    cartsService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(cartsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Carrinho de id #99 não foi encontrado',
    );
    cartsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(cartsService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateCartDto = { userId: 8 };
    const updated = { ...cart, ...updateDto };
    cartsService.update.mockResolvedValue(updated);

    await expect(controller.update(cart.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(cartsService.update).toHaveBeenCalledWith(cart.id, updateDto);
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException('Não foi possível remover o carrinho');
    cartsService.remove.mockRejectedValue(error);

    await expect(controller.remove(cart.id)).rejects.toBe(error);
    expect(cartsService.remove).toHaveBeenCalledWith(cart.id);
  });
});
