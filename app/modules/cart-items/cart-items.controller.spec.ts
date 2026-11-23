jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { CartItem } from '@/entities/cart-items.entity';
import { CreateCartItemDto } from '@/modules/cart-items/dto/create-cart-item.dto';
import { QueryCartItemDto } from '@/modules/cart-items/dto/query-cart-item.dto';
import { UpdateCartItemDto } from '@/modules/cart-items/dto/update-cart-item.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CartItemsController } from './cart-items.controller';
import { CartItemsService } from './cart-items.service';

type CartItemsServiceMock = jest.Mocked<
  Pick<CartItemsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('CartItemsController', () => {
  let controller: CartItemsController;
  let cartItemsService: CartItemsServiceMock;

  const cartItemDto: CreateCartItemDto = {
    cartId: 5,
    variantId: 3,
    quantity: 2,
  };

  const cartItem: CartItem = {
    id: 1,
    ...cartItemDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    cartItemsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CartItemsController],
      providers: [{ provide: CartItemsService, useValue: cartItemsService }],
    }).compile();

    controller = moduleRef.get(CartItemsController);
  });

  it('should pass item data to the service on create', async () => {
    cartItemsService.create.mockResolvedValue(cartItem);

    await expect(controller.create(cartItemDto)).resolves.toEqual(cartItem);
    expect(cartItemsService.create).toHaveBeenCalledWith(cartItemDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCartItemDto = {
      cartId: 5,
      variantId: 3,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [cartItem],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    cartItemsService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(cartItemsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Item de carrinho de id #99 não foi encontrado',
    );
    cartItemsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(cartItemsService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateCartItemDto = { quantity: 3 };
    const updated = { ...cartItem, ...updateDto };
    cartItemsService.update.mockResolvedValue(updated);

    await expect(controller.update(cartItem.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(cartItemsService.update).toHaveBeenCalledWith(
      cartItem.id,
      updateDto,
    );
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover o item do carrinho',
    );
    cartItemsService.remove.mockRejectedValue(error);

    await expect(controller.remove(cartItem.id)).rejects.toBe(error);
    expect(cartItemsService.remove).toHaveBeenCalledWith(cartItem.id);
  });
});
