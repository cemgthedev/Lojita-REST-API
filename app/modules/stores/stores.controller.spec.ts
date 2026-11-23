jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Store } from '@/entities/store.entity';
import { CreateStoreDto } from '@/modules/stores/dto/create-store.dto';
import { QueryStoreDto } from '@/modules/stores/dto/query-store.dto';
import { UpdateStoreDto } from '@/modules/stores/dto/update-store.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

type StoresServiceMock = jest.Mocked<
  Pick<StoresService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('StoresController', () => {
  let controller: StoresController;
  let storesService: StoresServiceMock;

  const storeDto: CreateStoreDto = {
    name: 'Minha loja',
    nickname: 'minha-loja',
    imageUrl: 'https://example.com/store.png',
    description: 'Loja de produtos',
    businessEmail: 'contato@example.com',
    phoneNumber: '+5511999999999',
    userId: 7,
  };

  const store: Store = {
    id: 1,
    ...storeDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    storesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [StoresController],
      providers: [{ provide: StoresService, useValue: storesService }],
    }).compile();

    controller = moduleRef.get(StoresController);
  });

  describe('create', () => {
    it('should pass the store data to the service and return the created store', async () => {
      storesService.create.mockResolvedValue(store);

      await expect(controller.create(storeDto)).resolves.toEqual(store);
      expect(storesService.create).toHaveBeenCalledWith(storeDto);
    });

    it('should propagate a conflict when the nickname is already registered', async () => {
      const error = new ConflictException(
        `O apelido '${storeDto.nickname}' já foi cadastrado`,
      );
      storesService.create.mockRejectedValue(error);

      await expect(controller.create(storeDto)).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('should pass the query filters and return matching stores', async () => {
      const query: QueryStoreDto = { name: 'Minha', limit: 10, page: 1 };
      const result = {
        data: [store],
        meta: { total: 1, limit: 10, page: 1, totalPages: 1 },
      };
      storesService.query.mockResolvedValue(result);

      await expect(controller.findAll(query)).resolves.toEqual(result);
      expect(storesService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar lojas');
      storesService.query.mockRejectedValue(error);

      await expect(controller.findAll({} as QueryStoreDto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the store id to the service and return the store', async () => {
      storesService.findOne.mockResolvedValue(store);

      await expect(controller.findOne(store.id)).resolves.toEqual(store);
      expect(storesService.findOne).toHaveBeenCalledWith(store.id);
    });

    it('should propagate not found when the store does not exist', async () => {
      const error = new NotFoundException('Loja de id #99 não foi encontrada');
      storesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the store id and update data to the service', async () => {
      const updateDto: UpdateStoreDto = { name: 'Minha loja nova' };
      const updated = { ...store, ...updateDto };
      storesService.update.mockResolvedValue(updated);

      await expect(controller.update(store.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(storesService.update).toHaveBeenCalledWith(store.id, updateDto);
    });

    it('should propagate not found when the store does not exist', async () => {
      const error = new NotFoundException('Loja de id #99 não foi encontrada');
      storesService.update.mockRejectedValue(error);

      await expect(controller.update(99, { name: 'Loja nova' })).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('should pass the store id to the service and return its result', async () => {
      storesService.remove.mockResolvedValue('Loja removida com sucesso');

      await expect(controller.remove(store.id)).resolves.toBe(
        'Loja removida com sucesso',
      );
      expect(storesService.remove).toHaveBeenCalledWith(store.id);
    });

    it('should propagate not found when the store does not exist', async () => {
      const error = new NotFoundException('Loja de id #99 não foi encontrada');
      storesService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the store cannot be deleted', async () => {
      const error = new ConflictException('Não foi possível remover a loja');
      storesService.remove.mockRejectedValue(error);

      await expect(controller.remove(store.id)).rejects.toBe(error);
    });
  });
});
