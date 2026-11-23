jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { UserAddress } from '@/entities/user-address.entity';
import { CreateUserAddressDto } from '@/modules/user-address/dto/create-user-address.dto';
import { QueryUserAddressDto } from '@/modules/user-address/dto/query-user-address.dto';
import { UpdateUserAddressDto } from '@/modules/user-address/dto/update-user-address.dto';
import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserAddressController } from './user-address.controller';
import { UserAddressService } from './user-address.service';

type UserAddressServiceMock = jest.Mocked<
  Pick<UserAddressService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('UserAddressController', () => {
  let controller: UserAddressController;
  let userAddressService: UserAddressServiceMock;

  const userAddressDto: CreateUserAddressDto = {
    name: 'Casa',
    type: TYPE_ADDRESS.HOME,
    cep: '12345-678',
    street: 'Rua das Flores',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Centro',
    number: '123',
    complement: 'Apto 4',
    userId: 7,
  };

  const userAddress: UserAddress = {
    id: 1,
    ...userAddressDto,
    type: TYPE_ADDRESS.HOME,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    userAddressService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UserAddressController],
      providers: [
        { provide: UserAddressService, useValue: userAddressService },
      ],
    }).compile();

    controller = moduleRef.get(UserAddressController);
  });

  describe('create', () => {
    it('should pass the address data to the service and return the created address', async () => {
      userAddressService.create.mockResolvedValue(userAddress);

      await expect(controller.create(userAddressDto)).resolves.toEqual(
        userAddress,
      );
      expect(userAddressService.create).toHaveBeenCalledWith(userAddressDto);
    });

    it('should propagate not found when the owner does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      userAddressService.create.mockRejectedValue(error);

      await expect(controller.create(userAddressDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass the filters to the service and return matching addresses', async () => {
      const query: QueryUserAddressDto = {
        city: 'São Paulo',
        userId: 7,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [userAddress],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      userAddressService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(userAddressService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar endereços de usuários');
      userAddressService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryUserAddressDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the address id to the service and return the address', async () => {
      userAddressService.findOne.mockResolvedValue(userAddress);

      await expect(controller.findOne(userAddress.id)).resolves.toEqual(
        userAddress,
      );
      expect(userAddressService.findOne).toHaveBeenCalledWith(userAddress.id);
    });

    it('should propagate not found when the address does not exist', async () => {
      const error = new NotFoundException(
        'Endereço de usuário de id #99 não foi encontrado',
      );
      userAddressService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the address id and data to the service', async () => {
      const updateDto: UpdateUserAddressDto = { name: 'Casa nova' };
      const updatedAddress = { ...userAddress, ...updateDto };
      userAddressService.update.mockResolvedValue(updatedAddress);

      await expect(
        controller.update(userAddress.id, updateDto),
      ).resolves.toEqual(updatedAddress);
      expect(userAddressService.update).toHaveBeenCalledWith(
        userAddress.id,
        updateDto,
      );
    });

    it('should propagate not found when the address does not exist', async () => {
      const error = new NotFoundException(
        'Endereço de usuário de id #99 não foi encontrado',
      );
      userAddressService.update.mockRejectedValue(error);

      await expect(controller.update(99, { name: 'Casa nova' })).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('should pass the address id to the service and return its result', async () => {
      userAddressService.remove.mockResolvedValue(
        'Endereço de usuário removido com sucesso',
      );

      await expect(controller.remove(userAddress.id)).resolves.toBe(
        'Endereço de usuário removido com sucesso',
      );
      expect(userAddressService.remove).toHaveBeenCalledWith(userAddress.id);
    });

    it('should propagate not found when the address does not exist', async () => {
      const error = new NotFoundException(
        'Endereço de usuário de id #99 não foi encontrado',
      );
      userAddressService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the address cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o endereço de usuário',
      );
      userAddressService.remove.mockRejectedValue(error);

      await expect(controller.remove(userAddress.id)).rejects.toBe(error);
    });
  });
});
