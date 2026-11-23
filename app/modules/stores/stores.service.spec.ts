jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Store } from '@/entities/store.entity';
import { User } from '@/entities/user.entity';
import { CreateStoreDto } from '@/modules/stores/dto/create-store.dto';
import { QueryStoreDto } from '@/modules/stores/dto/query-store.dto';
import { UsersService } from '@/modules/users/users.service';
import { Role } from '@/modules/users/enums/role.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { StoresService } from './stores.service';

describe('StoresService', () => {
  let service: StoresService;
  let repository: jest.Mocked<Repository<Store>>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Store>>;

  const storeDto: CreateStoreDto = {
    name: 'Minha loja',
    nickname: 'minha-loja',
    imageUrl: 'https://example.com/store.png',
    description: 'Loja de produtos',
    businessEmail: 'contato@example.com',
    phoneNumber: '+5511999999999',
    userId: 7,
  };

  const createStore = (): Store => ({
    id: 1,
    ...storeDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Store>>;

    repository = {
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Store>>;

    usersService = {
      usersRepository: {} as UsersService['usersRepository'],
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    service = new StoresService(repository, usersService);
  });

  describe('create', () => {
    it('should validate the owner and uniqueness before creating a store', async () => {
      const store = createStore();
      usersService.findOne.mockResolvedValue(user);
      repository.exists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      repository.create.mockReturnValue(store);
      repository.save.mockResolvedValue(store);

      await expect(service.create(storeDto)).resolves.toEqual(store);
      expect(usersService.findOne).toHaveBeenCalledWith(storeDto.userId);
      expect(repository.exists).toHaveBeenNthCalledWith(1, {
        where: { userId: storeDto.userId },
      });
      expect(repository.exists).toHaveBeenNthCalledWith(2, {
        where: { nickname: storeDto.nickname },
      });
      expect(repository.create).toHaveBeenCalledWith(storeDto);
      expect(repository.save).toHaveBeenCalledWith(store);
    });

    it('should not create a store when the owner does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(storeDto)).rejects.toBe(error);
      expect(repository.exists).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should reject a second store for the same owner', async () => {
      usersService.findOne.mockResolvedValue(user);
      repository.exists.mockResolvedValueOnce(true);

      await expect(service.create(storeDto)).rejects.toThrow(
        new ConflictException(
          `O usuário de id #${storeDto.userId} já possui uma loja cadastrada`,
        ),
      );
      expect(repository.exists).toHaveBeenCalledTimes(1);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should reject a nickname that is already registered', async () => {
      usersService.findOne.mockResolvedValue(user);
      repository.exists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await expect(service.create(storeDto)).rejects.toThrow(
        new ConflictException(
          `O apelido '${storeDto.nickname}' já foi cadastrado`,
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should filter stores by name and return pagination metadata', async () => {
      const store = createStore();
      const filters: QueryStoreDto = {
        name: 'Minha',
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[store], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [store],
        meta: { total: 35, limit: 20, page: 2, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('store');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.name ILIKE :name',
        { name: '%Minha%' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without a name filter using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryStoreDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, limit: 10, page: 1, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a store by id', async () => {
      const store = createStore();
      repository.findOne.mockResolvedValue(store);

      await expect(service.findOne(store.id)).resolves.toEqual(store);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: store.id },
      });
    });

    it('should throw not found when the store does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Loja de id #99 não foi encontrada'),
      );
    });
  });

  describe('update', () => {
    it('should update store data without checking an unchanged nickname', async () => {
      const existing = createStore();
      const updateDto = { name: 'Minha loja nova' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(repository.exists).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should check a changed nickname while excluding the current store', async () => {
      const existing = createStore();
      const updateDto = { nickname: 'minha-loja-nova' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.exists.mockResolvedValue(false);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(repository.exists).toHaveBeenCalledWith({
        where: { nickname: updateDto.nickname, id: Not(existing.id) },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject a nickname already used by another store', async () => {
      const existing = createStore();
      repository.findOne.mockResolvedValue(existing);
      repository.exists.mockResolvedValue(true);

      await expect(
        service.update(existing.id, { nickname: 'another-store' }),
      ).rejects.toThrow(
        new ConflictException("O apelido 'another-store' já foi cadastrado"),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the store does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Loja nova' })).rejects.toThrow(
        new NotFoundException('Loja de id #99 não foi encontrada'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a store and return a success message', async () => {
      const store = createStore();
      repository.findOne.mockResolvedValue(store);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(store.id)).resolves.toBe(
        'Loja removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(store.id);
    });

    it('should throw not found when the store does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Loja de id #99 não foi encontrada'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the store is not deleted', async () => {
      const store = createStore();
      repository.findOne.mockResolvedValue(store);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(store.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a loja'),
      );
    });
  });
});
