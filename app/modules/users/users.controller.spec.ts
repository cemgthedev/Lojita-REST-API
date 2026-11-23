jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import { User } from '@/entities/user.entity';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { QueryUserDto } from '@/modules/users/dto/query-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { Role } from '@/modules/users/enums/role.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

type UsersServiceMock = jest.Mocked<
  Pick<UsersService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersServiceMock;

  const userDto: CreateUserDto = {
    name: 'Ana Silva',
    cpf: '12345678901',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
  };

  const user: User = {
    id: 1,
    ...userDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  describe('create', () => {
    it('should pass the user data to the service and return the created user', async () => {
      usersService.create.mockResolvedValue(user);

      await expect(controller.create(userDto)).resolves.toEqual(user);
      expect(usersService.create).toHaveBeenCalledWith(userDto);
    });

    it('should propagate a conflict when the email is already registered', async () => {
      const error = new ConflictException(
        `O email ${userDto.email} já foi cadastrado`,
      );
      usersService.create.mockRejectedValue(error);

      await expect(controller.create(userDto)).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('should pass the query filters to the service', async () => {
      const query: QueryUserDto = {
        name: 'Ana',
        role: Role.CUSTOMER,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [user],
        meta: { total: 1, limit: 10, page: 1, totalPages: 1 },
      };
      usersService.query.mockResolvedValue(result);

      await expect(controller.findAll(query)).resolves.toEqual(result);
      expect(usersService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar usuários');
      usersService.query.mockRejectedValue(error);

      await expect(controller.findAll({})).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the user id to the service and return the user', async () => {
      usersService.findOne.mockResolvedValue(user);

      await expect(controller.findOne(user.id)).resolves.toEqual(user);
      expect(usersService.findOne).toHaveBeenCalledWith(user.id);
    });

    it('should propagate not found when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #99 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the user id and data to the service', async () => {
      const updateDto: UpdateUserDto = { name: 'Ana Souza' };
      const updatedUser = { ...user, ...updateDto };
      usersService.update.mockResolvedValue(updatedUser);

      await expect(controller.update(user.id, updateDto)).resolves.toEqual(
        updatedUser,
      );
      expect(usersService.update).toHaveBeenCalledWith(user.id, updateDto);
    });

    it('should propagate not found when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #99 não foi encontrado',
      );
      usersService.update.mockRejectedValue(error);

      await expect(controller.update(99, { name: 'Ana Souza' })).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('should pass the user id to the service and return its result', async () => {
      usersService.remove.mockResolvedValue('Conta removida com sucesso');

      await expect(controller.remove(user.id)).resolves.toBe(
        'Conta removida com sucesso',
      );
      expect(usersService.remove).toHaveBeenCalledWith(user.id);
    });

    it('should propagate not found when the user does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #99 não foi encontrado',
      );
      usersService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the user cannot be deleted', async () => {
      const error = new ConflictException('Não foi possível remover a conta');
      usersService.remove.mockRejectedValue(error);

      await expect(controller.remove(user.id)).rejects.toBe(error);
    });
  });
});
