jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import 'reflect-metadata';
import { User } from '@/entities/user.entity';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { QueryUserDto } from '@/modules/users/dto/query-user.dto';
import { Role } from '@/modules/users/enums/role.enum';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { UsersService } from './users.service';

type UsersRepositoryMock = Pick<
  jest.Mocked<Repository<User>>,
  'exists' | 'findOne' | 'create' | 'save' | 'delete' | 'createQueryBuilder'
>;

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<User>>;

  const userDto: CreateUserDto = {
    name: 'Ana Silva',
    cpf: '12345678901',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
  };

  const createUser = (): User => ({
    id: 1,
    ...userDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<User>>;

    repository = {
      exists: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<User>>;

    service = new UsersService(repository);
  });

  describe('create', () => {
    it('should create a user when email and CPF are available', async () => {
      const user = createUser();
      repository.exists.mockResolvedValue(false);
      repository.create.mockReturnValue(user);
      repository.save.mockResolvedValue(user);

      await expect(service.create(userDto)).resolves.toEqual(user);
      expect(repository.exists).toHaveBeenNthCalledWith(1, {
        where: { email: userDto.email },
      });
      expect(repository.exists).toHaveBeenNthCalledWith(2, {
        where: { cpf: userDto.cpf },
      });
      expect(repository.create).toHaveBeenCalledWith(userDto);
      expect(repository.save).toHaveBeenCalledWith(user);
    });

    it('should throw a conflict when the email is already registered', async () => {
      repository.exists.mockResolvedValueOnce(true);

      await expect(service.create(userDto)).rejects.toThrow(
        new ConflictException(`O email ${userDto.email} já foi cadastrado`),
      );
      expect(repository.exists).toHaveBeenCalledTimes(1);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the CPF is already registered', async () => {
      repository.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      await expect(service.create(userDto)).rejects.toThrow(
        new ConflictException('CPF já cadastrado'),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should filter users and return pagination metadata', async () => {
      const user = createUser();
      const filters: QueryUserDto = {
        name: 'Ana',
        role: Role.CUSTOMER,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[user], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [user],
        meta: {
          total: 35,
          limit: 20,
          page: 2,
          totalPages: 2,
        },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'user.name ILIKE :name',
        { name: '%Ana%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'user.role = :role',
        { role: Role.CUSTOMER },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryUserDto())).resolves.toEqual({
        data: [],
        meta: {
          total: 0,
          limit: 10,
          page: 1,
          totalPages: 0,
        },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a user by id', async () => {
      const user = createUser();
      repository.findOne.mockResolvedValue(user);

      await expect(service.findOne(user.id)).resolves.toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
      });
    });

    it('should throw not found when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Usuário de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const existingUser = createUser();
      const updateDto = { name: 'Ana Souza' };
      const updatedUser = { ...existingUser, ...updateDto };
      repository.findOne.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(updatedUser);

      await expect(service.update(existingUser.id, updateDto)).resolves.toEqual(
        updatedUser,
      );
      expect(repository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should not save when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { name: 'Ana Souza' }),
      ).rejects.toThrow(
        new NotFoundException('Usuário de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a user and return a success message', async () => {
      const user = createUser();
      repository.findOne.mockResolvedValue(user);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(user.id)).resolves.toBe(
        'Conta removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(user.id);
    });

    it('should not delete when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Usuário de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when no user is deleted', async () => {
      const user = createUser();
      repository.findOne.mockResolvedValue(user);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(user.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a conta'),
      );
    });
  });
});
