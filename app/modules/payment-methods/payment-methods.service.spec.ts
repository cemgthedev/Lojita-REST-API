jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { User } from '@/entities/user.entity';
import { CreatePaymentMethodDto } from '@/modules/payment-methods/dto/create-payment-method.dto';
import { QueryPaymentMethodDto } from '@/modules/payment-methods/dto/query-payment-method.dto';
import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { PaymentMethodsService } from './payment-methods.service';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let repository: jest.Mocked<Repository<PaymentMethod>>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<PaymentMethod>>;

  const paymentMethodDto: CreatePaymentMethodDto = {
    type: PAYMENT_METHOD_TYPE.CARD,
    method: 'Visa',
    provider: 'Stripe',
    providerToken: 'test-token',
    userId: 7,
  };

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createPaymentMethod = (): PaymentMethod => ({
    id: 1,
    ...paymentMethodDto,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<PaymentMethod>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<PaymentMethod>>;

    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new PaymentMethodsService(repository, usersService);
  });

  describe('create', () => {
    it('should validate the owner and create the payment method', async () => {
      const paymentMethod = createPaymentMethod();
      usersService.findOne.mockResolvedValue(user);
      repository.create.mockReturnValue(paymentMethod);
      repository.save.mockResolvedValue(paymentMethod);

      await expect(service.create(paymentMethodDto)).resolves.toEqual(
        paymentMethod,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(
        paymentMethodDto.userId,
      );
      expect(repository.create).toHaveBeenCalledWith(paymentMethodDto);
      expect(repository.save).toHaveBeenCalledWith(paymentMethod);
    });

    it('should not create the payment method when the owner does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(paymentMethodDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join the user, apply filters, and return pagination metadata', async () => {
      const paymentMethod = createPaymentMethod();
      const filters: QueryPaymentMethodDto = {
        type: PAYMENT_METHOD_TYPE.CARD,
        method: 'Visa',
        provider: 'Stripe',
        userId: 7,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[paymentMethod], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [paymentMethod],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'paymentMethod',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'paymentMethod.user',
        'user',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'paymentMethod.type = :type',
        { type: PAYMENT_METHOD_TYPE.CARD },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'paymentMethod.method ILIKE :method',
        { method: '%Visa%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'paymentMethod.provider ILIKE :provider',
        { provider: '%Stripe%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'paymentMethod.userId = :userId',
        { userId: 7 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryPaymentMethodDto())).resolves.toEqual(
        {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a payment method and load its owner', async () => {
      const paymentMethod = createPaymentMethod();
      repository.findOne.mockResolvedValue(paymentMethod);

      await expect(service.findOne(paymentMethod.id)).resolves.toEqual(
        paymentMethod,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: paymentMethod.id },
        relations: { user: true },
      });
    });

    it('should throw not found when the payment method does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Método de pagamento de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed owner and update the payment method', async () => {
      const existing = createPaymentMethod();
      const updateDto = { method: 'Mastercard', userId: 8 };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockResolvedValue({ ...user, id: 8 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the payment method does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { method: 'Mastercard' }),
      ).rejects.toThrow(
        new NotFoundException(
          'Método de pagamento de id #99 não foi encontrado',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('should not save when the new owner does not exist', async () => {
      const existing = createPaymentMethod();
      const error = new NotFoundException(
        'Usuário de id #8 não foi encontrado',
      );
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockRejectedValue(error);

      await expect(service.update(existing.id, { userId: 8 })).rejects.toBe(
        error,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the payment method and return a success message', async () => {
      const paymentMethod = createPaymentMethod();
      repository.findOne.mockResolvedValue(paymentMethod);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(paymentMethod.id)).resolves.toBe(
        'Método de pagamento removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(paymentMethod.id);
    });

    it('should throw not found when the payment method does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Método de pagamento de id #99 não foi encontrado',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the payment method is not deleted', async () => {
      const paymentMethod = createPaymentMethod();
      repository.findOne.mockResolvedValue(paymentMethod);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(paymentMethod.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o método de pagamento'),
      );
    });
  });
});
