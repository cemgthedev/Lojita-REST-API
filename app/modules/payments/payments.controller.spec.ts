jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Payment } from '@/entities/payment.entity';
import { CreatePaymentDto } from '@/modules/payments/dto/create-payment.dto';
import { QueryPaymentDto } from '@/modules/payments/dto/query-payment.dto';
import { UpdatePaymentDto } from '@/modules/payments/dto/update-payment.dto';
import { PAYMENT_STATUS } from '@/modules/payments/enums/payment-status.enum';
import { PAYMENT_TYPE } from '@/modules/payments/types/payment.type';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

type PaymentsServiceMock = jest.Mocked<
  Pick<PaymentsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsServiceMock;

  const paymentDto: CreatePaymentDto = {
    provider: 'Stripe',
    providerPaymentId: 'payment-123',
    methodType: PAYMENT_TYPE.CARD,
    amount: 125.5,
    currency: 'BRL',
    status: PAYMENT_STATUS.PENDING,
    paymentMethodId: 4,
    orderId: 9,
  };

  const payment: Payment = {
    id: 1,
    ...paymentDto,
    amount: '125.50',
    currency: 'BRL',
    status: PAYMENT_STATUS.PENDING,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    paymentsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    controller = moduleRef.get(PaymentsController);
  });

  describe('create', () => {
    it('should pass the payment data to the service and return the payment', async () => {
      paymentsService.create.mockResolvedValue(payment);

      await expect(controller.create(paymentDto)).resolves.toEqual(payment);
      expect(paymentsService.create).toHaveBeenCalledWith(paymentDto);
    });

    it('should propagate a conflict when the provider payment id is duplicated', async () => {
      const error = new ConflictException(
        'Este identificador de pagamento já está registrado para o provedor',
      );
      paymentsService.create.mockRejectedValue(error);

      await expect(controller.create(paymentDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching payments', async () => {
      const query: QueryPaymentDto = {
        status: PAYMENT_STATUS.PENDING,
        methodType: PAYMENT_TYPE.CARD,
        provider: 'Stripe',
        orderId: 9,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [payment],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      paymentsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(paymentsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar pagamentos');
      paymentsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryPaymentDto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the payment id to the service and return the payment', async () => {
      paymentsService.findOne.mockResolvedValue(payment);

      await expect(controller.findOne(payment.id)).resolves.toEqual(payment);
      expect(paymentsService.findOne).toHaveBeenCalledWith(payment.id);
    });

    it('should propagate not found when the payment does not exist', async () => {
      const error = new NotFoundException(
        'Pagamento de id #99 não foi encontrado',
      );
      paymentsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the payment id and update data to the service', async () => {
      const updateDto: UpdatePaymentDto = {
        status: PAYMENT_STATUS.PAID,
      };
      const updated: Payment = {
        ...payment,
        ...updateDto,
        amount: payment.amount,
      };
      paymentsService.update.mockResolvedValue(updated);

      await expect(controller.update(payment.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(paymentsService.update).toHaveBeenCalledWith(
        payment.id,
        updateDto,
      );
    });

    it('should propagate not found when the payment does not exist', async () => {
      const error = new NotFoundException(
        'Pagamento de id #99 não foi encontrado',
      );
      paymentsService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { status: PAYMENT_STATUS.PAID }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the payment id to the service and return its result', async () => {
      paymentsService.remove.mockResolvedValue(
        'Pagamento removido com sucesso',
      );

      await expect(controller.remove(payment.id)).resolves.toBe(
        'Pagamento removido com sucesso',
      );
      expect(paymentsService.remove).toHaveBeenCalledWith(payment.id);
    });

    it('should propagate not found when the payment does not exist', async () => {
      const error = new NotFoundException(
        'Pagamento de id #99 não foi encontrado',
      );
      paymentsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the payment cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o pagamento',
      );
      paymentsService.remove.mockRejectedValue(error);

      await expect(controller.remove(payment.id)).rejects.toBe(error);
    });
  });
});
