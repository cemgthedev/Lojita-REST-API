jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { CartItem } from '@/entities/cart-items.entity';
import { Cart } from '@/entities/cart.entity';
import { Variant } from '@/entities/variant.entity';
import { CartsService } from '@/modules/carts/carts.service';
import { CreateCartItemDto } from '@/modules/cart-items/dto/create-cart-item.dto';
import { QueryCartItemDto } from '@/modules/cart-items/dto/query-cart-item.dto';
import { VariantsService } from '@/modules/variants/variants.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CartItemsService } from './cart-items.service';

describe('CartItemsService', () => {
  let service: CartItemsService;
  let repository: jest.Mocked<Repository<CartItem>>;
  let cartsService: jest.Mocked<Pick<CartsService, 'findOne'>>;
  let variantsService: jest.Mocked<Pick<VariantsService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<CartItem>>;

  const cart: Cart = {
    id: 5,
    userId: 7,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const variant: Variant = {
    id: 3,
    price: 99.99,
    stock: 5,
    sku: 'SHIRT-BLUE-M',
    status: STATUS.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const cartItemDto: CreateCartItemDto = {
    cartId: cart.id,
    variantId: variant.id,
    quantity: 2,
  };

  const createCartItem = (): CartItem => ({
    id: 1,
    ...cartItemDto,
    cart,
    variant,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<CartItem>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CartItem>>;

    cartsService = { findOne: jest.fn() };
    variantsService = { findOne: jest.fn() };
    service = new CartItemsService(
      repository,
      cartsService as unknown as CartsService,
      variantsService as unknown as VariantsService,
    );
  });

  describe('create', () => {
    it('should validate the cart and variant before creating the item', async () => {
      const cartItem = createCartItem();
      cartsService.findOne.mockResolvedValue(cart);
      variantsService.findOne.mockResolvedValue(variant);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(cartItem);
      repository.save.mockResolvedValue(cartItem);

      await expect(service.create(cartItemDto)).resolves.toEqual(cartItem);
      expect(cartsService.findOne).toHaveBeenCalledWith(cart.id);
      expect(variantsService.findOne).toHaveBeenCalledWith(variant.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { variantId: variant.id },
      });
      expect(repository.create).toHaveBeenCalledWith(cartItemDto);
      expect(repository.save).toHaveBeenCalledWith(cartItem);
    });

    it('should not create an item when a referenced cart does not exist', async () => {
      const error = new NotFoundException(
        'Carrinho de id #5 não foi encontrado',
      );
      cartsService.findOne.mockRejectedValue(error);
      variantsService.findOne.mockResolvedValue(variant);

      await expect(service.create(cartItemDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should reject a variant that is already in a cart', async () => {
      repository.findOne.mockResolvedValue(createCartItem());

      await expect(service.create(cartItemDto)).rejects.toThrow(
        new ConflictException(
          `A variante de id #${variant.id} já está em um item de carrinho`,
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and paginate results', async () => {
      const cartItem = createCartItem();
      const filters: QueryCartItemDto = {
        cartId: cart.id,
        variantId: variant.id,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[cartItem], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [cartItem],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('cartItem');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'cartItem.cart',
        'cart',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'cartItem.variant',
        'variant',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        3,
        'variant.product',
        'product',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'cartItem.cartId = :cartId',
        { cartId: cart.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'cartItem.variantId = :variantId',
        { variantId: variant.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCartItemDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a cart item and load its cart and variant product', async () => {
      const cartItem = createCartItem();
      repository.findOne.mockResolvedValue(cartItem);

      await expect(service.findOne(cartItem.id)).resolves.toEqual(cartItem);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: cartItem.id },
        relations: { cart: true, variant: { product: true } },
      });
    });

    it('should throw not found when the cart item does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Item de carrinho de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the item', async () => {
      const existing = createCartItem();
      const nextCart = { ...cart, id: 6 };
      const nextVariant = { ...variant, id: 4 };
      const updated = {
        ...existing,
        cartId: nextCart.id,
        variantId: nextVariant.id,
        cart: nextCart,
        variant: nextVariant,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      cartsService.findOne.mockResolvedValue(nextCart);
      variantsService.findOne.mockResolvedValue(nextVariant);
      repository.save.mockResolvedValue(updated);

      await expect(
        service.update(existing.id, {
          cartId: nextCart.id,
          variantId: nextVariant.id,
        }),
      ).resolves.toEqual(updated);
      expect(cartsService.findOne).toHaveBeenCalledWith(nextCart.id);
      expect(variantsService.findOne).toHaveBeenCalledWith(nextVariant.id);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { variantId: nextVariant.id },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update that uses a variant already in another item', async () => {
      const existing = createCartItem();
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, id: 2, variantId: 4 });
      variantsService.findOne.mockResolvedValue({ ...variant, id: 4 });

      await expect(
        service.update(existing.id, { variantId: 4 }),
      ).rejects.toThrow(
        new ConflictException(
          'A variante de id #4 já está em um item de carrinho',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the cart item does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { quantity: 3 })).rejects.toThrow(
        new NotFoundException('Item de carrinho de id #99 não foi encontrado'),
      );
      expect(cartsService.findOne).not.toHaveBeenCalled();
      expect(variantsService.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the item and return a success message', async () => {
      const cartItem = createCartItem();
      repository.findOne.mockResolvedValue(cartItem);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(cartItem.id)).resolves.toBe(
        'Item do carrinho removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(cartItem.id);
    });

    it('should throw a conflict when the item is not deleted', async () => {
      const cartItem = createCartItem();
      repository.findOne.mockResolvedValue(cartItem);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(cartItem.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o item do carrinho'),
      );
    });
  });
});
