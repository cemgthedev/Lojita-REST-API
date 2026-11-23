jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Order } from '@/entities/order.entity';
import { Payment } from '@/entities/payment.entity';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import { OrdersService } from '@/modules/orders/orders.service';
import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { PaymentMethodsService } from '@/modules/payment-methods/payment-methods.service';
import { CreatePaymentDto } from '@/modules/payments/dto/create-payment.dto';
import { QueryPaymentDto } from '@/modules/payments/dto/query-payment.dto';
import { PAYMENT_STATUS } from '@/modules/payments/enums/payment-status.enum';
import { PAYMENT_TYPE } from '@/modules/payments/types/payment.type';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repository: jest.Mocked<Repository<Payment>>;
  let ordersService: jest.Mocked<OrdersService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Payment>>;

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

  const order: Order = {
    id: 9,
    status: ORDER_STATUS.PENDING,
    subtotal: '125.50',
    shippingTotal: '0.00',
    discountTotal: '0.00',
    total: '125.50',
    userId: 3,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const paymentMethod: PaymentMethod = {
    id: 4,
    type: PAYMENT_METHOD_TYPE.CARD,
    method: 'Visa',
    provider: 'Stripe',
    providerToken: 'test-token',
    userId: 3,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createPayment = (): Payment => ({
    id: 1,
    ...paymentDto,
    amount: '125.5',
    currency: 'BRL',
    status: PAYMENT_STATUS.PENDING,
    order,
    paymentMethod,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<Payment>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Payment>>;

    ordersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;
    paymentMethodsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<PaymentMethodsService>;

    service = new PaymentsService(
      repository,
      ordersService,
      paymentMethodsService,
    );
  });

  describe('create', () => {
    it('should validate references, normalize amount, and create the payment', async () => {
      const payment = createPayment();
      ordersService.findOne.mockResolvedValue(order);
      paymentMethodsService.findOne.mockResolvedValue(paymentMethod);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(payment);
      repository.save.mockResolvedValue(payment);

      await expect(service.create(paymentDto)).resolves.toEqual(payment);
      expect(ordersService.findOne).toHaveBeenCalledWith(paymentDto.orderId);
      expect(paymentMethodsService.findOne).toHaveBeenCalledWith(
        paymentDto.paymentMethodId,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          provider: paymentDto.provider,
          providerPaymentId: paymentDto.providerPaymentId,
        },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...paymentDto,
        amount: '125.5',
        order,
        paymentMethod,
      });
      expect(repository.save).toHaveBeenCalledWith(payment);
    });

    it('should reject a provider payment id that is already registered', async () => {
      const existing = { ...createPayment(), id: 2 };
      ordersService.findOne.mockResolvedValue(order);
      paymentMethodsService.findOne.mockResolvedValue(paymentMethod);
      repository.findOne.mockResolvedValue(existing);

      await expect(service.create(paymentDto)).rejects.toThrow(
        new ConflictException(
          'Este identificador de pagamento já está registrado para o provedor',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not create the payment when a referenced order is missing', async () => {
      const error = new NotFoundException('Pedido de id #9 não foi encontrado');
      ordersService.findOne.mockRejectedValue(error);

      await expect(service.create(paymentDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const payment = createPayment();
      const filters: QueryPaymentDto = {
        status: PAYMENT_STATUS.PENDING,
        methodType: PAYMENT_TYPE.CARD,
        provider: 'Stripe',
        providerPaymentId: 'payment-123',
        paymentMethodId: 4,
        orderId: 9,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[payment], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [payment],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('payment');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'payment.paymentMethod',
        'paymentMethod',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'payment.order',
        'order',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'payment.status = :status',
        { status: PAYMENT_STATUS.PENDING },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'payment.methodType = :methodType',
        { methodType: PAYMENT_TYPE.CARD },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'payment.provider ILIKE :provider',
        { provider: '%Stripe%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'payment.providerPaymentId = :providerPaymentId',
        { providerPaymentId: 'payment-123' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        5,
        'payment.paymentMethodId = :paymentMethodId',
        { paymentMethodId: 4 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        6,
        'payment.orderId = :orderId',
        { orderId: 9 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryPaymentDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a payment and load its order and payment method', async () => {
      const payment = createPayment();
      repository.findOne.mockResolvedValue(payment);

      await expect(service.findOne(payment.id)).resolves.toEqual(payment);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: payment.id },
        relations: { order: true, paymentMethod: true },
      });
    });

    it('should throw not found when the payment does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Pagamento de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update normalized payment data', async () => {
      const existing = createPayment();
      const newOrder = { ...order, id: 10 };
      const newPaymentMethod = { ...paymentMethod, id: 5 };
      const updateDto = {
        provider: 'Stripe',
        providerPaymentId: 'payment-456',
        amount: 150,
        status: PAYMENT_STATUS.PAID,
        paymentMethodId: 5,
        orderId: 10,
      };
      const updated = {
        ...existing,
        ...updateDto,
        amount: '150',
        order: newOrder,
        paymentMethod: newPaymentMethod,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      ordersService.findOne.mockResolvedValue(newOrder);
      paymentMethodsService.findOne.mockResolvedValue(newPaymentMethod);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(ordersService.findOne).toHaveBeenCalledWith(10);
      expect(paymentMethodsService.findOne).toHaveBeenCalledWith(5);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { provider: 'Stripe', providerPaymentId: 'payment-456' },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update that reuses another payment provider id', async () => {
      const existing = createPayment();
      const duplicate = { ...existing, id: 2 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);

      await expect(
        service.update(existing.id, { providerPaymentId: 'payment-duplicate' }),
      ).rejects.toThrow(
        new ConflictException(
          'Este identificador de pagamento já está registrado para o provedor',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the payment does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { status: PAYMENT_STATUS.PAID }),
      ).rejects.toThrow(
        new NotFoundException('Pagamento de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the payment and return a success message', async () => {
      const payment = createPayment();
      repository.findOne.mockResolvedValue(payment);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(payment.id)).resolves.toBe(
        'Pagamento removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(payment.id);
    });

    it('should throw not found when the payment does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Pagamento de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the payment is not deleted', async () => {
      const payment = createPayment();
      repository.findOne.mockResolvedValue(payment);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(payment.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o pagamento'),
      );
    });
  });
});
