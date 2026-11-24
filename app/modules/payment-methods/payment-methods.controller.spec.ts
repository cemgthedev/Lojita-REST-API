jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { CreatePaymentMethodDto } from '@/modules/payment-methods/dto/create-payment-method.dto';
import { QueryPaymentMethodDto } from '@/modules/payment-methods/dto/query-payment-method.dto';
import { UpdatePaymentMethodDto } from '@/modules/payment-methods/dto/update-payment-method.dto';
import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

type PaymentMethodsServiceMock = jest.Mocked<
  Pick<
    PaymentMethodsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('PaymentMethodsController', () => {
  let controller: PaymentMethodsController;
  let paymentMethodsService: PaymentMethodsServiceMock;

  const paymentMethodDto: CreatePaymentMethodDto = {
    type: PAYMENT_METHOD_TYPE.CARD,
    method: 'Visa',
    provider: 'Stripe',
    providerToken: 'test-token',
    userId: 7,
  };

  const paymentMethod: PaymentMethod = {
    id: 1,
    ...paymentMethodDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    paymentMethodsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentMethodsController],
      providers: [
        { provide: PaymentMethodsService, useValue: paymentMethodsService },
      ],
    }).compile();

    controller = moduleRef.get(PaymentMethodsController);
  });

  describe('create', () => {
    it('should pass the payment method data to the service', async () => {
      paymentMethodsService.create.mockResolvedValue(paymentMethod);

      await expect(controller.create(paymentMethodDto)).resolves.toEqual(
        paymentMethod,
      );
      expect(paymentMethodsService.create).toHaveBeenCalledWith(
        paymentMethodDto,
      );
    });

    it('should propagate not found when the owner does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      paymentMethodsService.create.mockRejectedValue(error);

      await expect(controller.create(paymentMethodDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching methods', async () => {
      const query: QueryPaymentMethodDto = {
        type: PAYMENT_METHOD_TYPE.CARD,
        provider: 'Stripe',
        userId: 7,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [paymentMethod],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      paymentMethodsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(paymentMethodsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar métodos de pagamento');
      paymentMethodsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryPaymentMethodDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the payment method id to the service', async () => {
      paymentMethodsService.findOne.mockResolvedValue(paymentMethod);

      await expect(controller.findOne(paymentMethod.id)).resolves.toEqual(
        paymentMethod,
      );
      expect(paymentMethodsService.findOne).toHaveBeenCalledWith(
        paymentMethod.id,
      );
    });

    it('should propagate not found when the payment method does not exist', async () => {
      const error = new NotFoundException(
        'Método de pagamento de id #99 não foi encontrado',
      );
      paymentMethodsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the payment method id and update data to the service', async () => {
      const updateDto: UpdatePaymentMethodDto = { method: 'Mastercard' };
      const updated = { ...paymentMethod, ...updateDto };
      paymentMethodsService.update.mockResolvedValue(updated);

      await expect(
        controller.update(paymentMethod.id, updateDto),
      ).resolves.toEqual(updated);
      expect(paymentMethodsService.update).toHaveBeenCalledWith(
        paymentMethod.id,
        updateDto,
      );
    });

    it('should propagate not found when the payment method does not exist', async () => {
      const error = new NotFoundException(
        'Método de pagamento de id #99 não foi encontrado',
      );
      paymentMethodsService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { method: 'Mastercard' }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the payment method id and return the service result', async () => {
      paymentMethodsService.remove.mockResolvedValue(
        'Método de pagamento removido com sucesso',
      );

      await expect(controller.remove(paymentMethod.id)).resolves.toBe(
        'Método de pagamento removido com sucesso',
      );
      expect(paymentMethodsService.remove).toHaveBeenCalledWith(
        paymentMethod.id,
      );
    });

    it('should propagate not found when the payment method does not exist', async () => {
      const error = new NotFoundException(
        'Método de pagamento de id #99 não foi encontrado',
      );
      paymentMethodsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the payment method cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o método de pagamento',
      );
      paymentMethodsService.remove.mockRejectedValue(error);

      await expect(controller.remove(paymentMethod.id)).rejects.toBe(error);
    });
  });
});
