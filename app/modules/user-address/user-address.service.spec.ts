jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import 'reflect-metadata';
import { UserAddress } from '@/entities/user-address.entity';
import { User } from '@/entities/user.entity';
import { CreateUserAddressDto } from '@/modules/user-address/dto/create-user-address.dto';
import { QueryUserAddressDto } from '@/modules/user-address/dto/query-user-address.dto';
import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { UserAddressService } from './user-address.service';

type UsersServiceMock = jest.Mocked<UsersService>;

describe('UserAddressService', () => {
  let service: UserAddressService;
  let repository: jest.Mocked<Repository<UserAddress>>;
  let usersService: UsersServiceMock;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<UserAddress>>;

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

  const createUserAddress = (): UserAddress => ({
    id: 1,
    ...userAddressDto,
    type: TYPE_ADDRESS.HOME,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const createUser = (id: number): User => ({
    id,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<UserAddress>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserAddress>>;

    usersService = {
      usersRepository: {} as UsersService['usersRepository'],
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    service = new UserAddressService(repository, usersService);
  });

  describe('create', () => {
    it('should verify the owner and create the user address', async () => {
      const userAddress = createUserAddress();
      usersService.findOne.mockResolvedValue(createUser(userAddressDto.userId));
      repository.create.mockReturnValue(userAddress);
      repository.save.mockResolvedValue(userAddress);

      await expect(service.create(userAddressDto)).resolves.toEqual(
        userAddress,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(userAddressDto.userId);
      expect(repository.create).toHaveBeenCalledWith(userAddressDto);
      expect(repository.save).toHaveBeenCalledWith(userAddress);
    });

    it('should not create the address when its owner does not exist', async () => {
      const error = new NotFoundException(
        `Usuário de id #${userAddressDto.userId} não foi encontrado`,
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(userAddressDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const userAddress = createUserAddress();
      const filters: QueryUserAddressDto = {
        name: 'Casa',
        type: TYPE_ADDRESS.HOME,
        cep: '12345',
        city: 'São',
        state: 'SP',
        userId: 7,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[userAddress], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [userAddress],
        meta: {
          total: 35,
          page: 2,
          limit: 20,
          totalPages: 2,
        },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('userAddress');
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'userAddress.name ILIKE :name',
        { name: '%Casa%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'userAddress.type = :type',
        { type: TYPE_ADDRESS.HOME },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'userAddress.cep ILIKE :cep',
        { cep: '%12345%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'userAddress.city ILIKE :city',
        { city: '%São%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        5,
        'userAddress.state ILIKE :state',
        { state: '%SP%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        6,
        'userAddress.userId = :userId',
        { userId: 7 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryUserAddressDto())).resolves.toEqual({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a user address by id', async () => {
      const userAddress = createUserAddress();
      repository.findOne.mockResolvedValue(userAddress);

      await expect(service.findOne(userAddress.id)).resolves.toEqual(
        userAddress,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userAddress.id },
      });
    });

    it('should throw not found when the user address does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Endereço de usuário de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should update a user address and validate a changed owner', async () => {
      const existingAddress = createUserAddress();
      const updateDto = { name: 'Casa nova', userId: 8 };
      const updatedAddress = { ...existingAddress, ...updateDto };
      repository.findOne.mockResolvedValue(existingAddress);
      usersService.findOne.mockResolvedValue(createUser(8));
      repository.save.mockResolvedValue(updatedAddress);

      await expect(
        service.update(existingAddress.id, updateDto),
      ).resolves.toEqual(updatedAddress);
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updatedAddress);
    });

    it('should not save when the user address does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Casa nova' })).rejects.toThrow(
        new NotFoundException(
          'Endereço de usuário de id #99 não foi encontrado',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('should not save when the new owner does not exist', async () => {
      const existingAddress = createUserAddress();
      const error = new NotFoundException(
        'Usuário de id #8 não foi encontrado',
      );
      repository.findOne.mockResolvedValue(existingAddress);
      usersService.findOne.mockRejectedValue(error);

      await expect(
        service.update(existingAddress.id, { userId: 8 }),
      ).rejects.toBe(error);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a user address and return a success message', async () => {
      const userAddress = createUserAddress();
      repository.findOne.mockResolvedValue(userAddress);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(userAddress.id)).resolves.toBe(
        'Endereço de usuário removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(userAddress.id);
    });

    it('should not delete when the user address does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Endereço de usuário de id #99 não foi encontrado',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when no user address is deleted', async () => {
      const userAddress = createUserAddress();
      repository.findOne.mockResolvedValue(userAddress);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(userAddress.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o endereço de usuário'),
      );
    });
  });
});
