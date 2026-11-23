jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Cart } from '@/entities/cart.entity';
import { User } from '@/entities/user.entity';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCartDto } from './dto/create-cart.dto';
import { QueryCartDto } from './dto/query-cart.dto';
import { CartsService } from './carts.service';

describe('CartsService', () => {
  let service: CartsService;
  let repository: jest.Mocked<Repository<Cart>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Cart>>;

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const cartDto: CreateCartDto = { userId: user.id };

  const createCart = (): Cart => ({
    id: 5,
    ...cartDto,
    user,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Cart>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Cart>>;

    usersService = { findOne: jest.fn() };
    service = new CartsService(
      repository,
      usersService as unknown as UsersService,
    );
  });

  describe('create', () => {
    it('should validate the user and create a cart when none exists', async () => {
      const cart = createCart();
      usersService.findOne.mockResolvedValue(user);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(cart);
      repository.save.mockResolvedValue(cart);

      await expect(service.create(cartDto)).resolves.toEqual(cart);
      expect(usersService.findOne).toHaveBeenCalledWith(user.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(repository.create).toHaveBeenCalledWith(cartDto);
      expect(repository.save).toHaveBeenCalledWith(cart);
    });

    it('should reject a second cart for the same user', async () => {
      repository.findOne.mockResolvedValue(createCart());

      await expect(service.create(cartDto)).rejects.toThrow(
        new ConflictException(
          `O usuário de id #${user.id} já possui um carrinho`,
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not create a cart when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(cartDto)).rejects.toBe(error);
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should filter by user and return pagination metadata', async () => {
      const cart = createCart();
      const filters: QueryCartDto = { userId: user.id, limit: 20, page: 2 };
      queryBuilder.getManyAndCount.mockResolvedValue([[cart], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [cart],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('cart');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cart.userId = :userId',
        { userId: user.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without an optional user filter using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCartDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a cart by id', async () => {
      const cart = createCart();
      repository.findOne.mockResolvedValue(cart);

      await expect(service.findOne(cart.id)).resolves.toEqual(cart);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: cart.id },
      });
    });

    it('should throw not found when the cart does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Carrinho de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed user and save the cart', async () => {
      const existing = createCart();
      const nextUser = { ...user, id: 8 };
      const updated = { ...existing, userId: nextUser.id };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      usersService.findOne.mockResolvedValue(nextUser);
      repository.save.mockResolvedValue(updated);

      await expect(
        service.update(existing.id, { userId: nextUser.id }),
      ).resolves.toEqual(updated);
      expect(usersService.findOne).toHaveBeenCalledWith(nextUser.id);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { userId: nextUser.id },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject moving the cart to a user who already has one', async () => {
      const existing = createCart();
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, id: 8, userId: 9 });
      usersService.findOne.mockResolvedValue({ ...user, id: 9 });

      await expect(service.update(existing.id, { userId: 9 })).rejects.toThrow(
        new ConflictException('O usuário de id #9 já possui um carrinho'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the cart does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { userId: 8 })).rejects.toThrow(
        new NotFoundException('Carrinho de id #99 não foi encontrado'),
      );
      expect(usersService.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the cart and return a success message', async () => {
      const cart = createCart();
      repository.findOne.mockResolvedValue(cart);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(cart.id)).resolves.toBe(
        'Carrinho removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(cart.id);
    });

    it('should throw a conflict when the cart is not deleted', async () => {
      const cart = createCart();
      repository.findOne.mockResolvedValue(cart);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(cart.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o carrinho'),
      );
    });
  });
});
