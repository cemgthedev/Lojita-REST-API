import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Order } from '@/entities/order.entity';
import { Payment } from '@/entities/payment.entity';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import { PaymentMethodsService } from '@/modules/payment-methods/payment-methods.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

export type PaymentsResponse = {
  data: Payment[];
  meta: PaginationResponse;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly ordersService: OrdersService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  async create(payment: CreatePaymentDto) {
    const { order, paymentMethod } = await this.validateReferences(payment);
    await this.ensureProviderPaymentIsUnique(
      payment.provider,
      payment.providerPaymentId,
    );

    const newPayment = this.paymentsRepository.create({
      ...this.toPaymentEntity(payment),
      order,
      paymentMethod,
    });

    return this.paymentsRepository.save(newPayment);
  }

  async query(query: QueryPaymentDto): Promise<PaymentsResponse> {
    const {
      status,
      methodType,
      provider,
      providerPaymentId,
      paymentMethodId,
      orderId,
      limit = 10,
      page = 1,
    } = query;
    const queryBuilder = this.paymentsRepository.createQueryBuilder('payment');

    queryBuilder
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('payment.order', 'order');

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (methodType) {
      queryBuilder.andWhere('payment.methodType = :methodType', {
        methodType,
      });
    }

    if (provider) {
      queryBuilder.andWhere('payment.provider ILIKE :provider', {
        provider: `%${provider}%`,
      });
    }

    if (providerPaymentId) {
      queryBuilder.andWhere('payment.providerPaymentId = :providerPaymentId', {
        providerPaymentId,
      });
    }

    if (paymentMethodId !== undefined) {
      queryBuilder.andWhere('payment.paymentMethodId = :paymentMethodId', {
        paymentMethodId,
      });
    }

    if (orderId !== undefined) {
      queryBuilder.andWhere('payment.orderId = :orderId', { orderId });
    }

    const [payments, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { order: true, paymentMethod: true },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento de id #${id} não foi encontrado`);
    }

    return payment;
  }

  async update(id: number, payment: UpdatePaymentDto) {
    const paymentResponse = await this.findOne(id);
    const { order, paymentMethod } = await this.validateReferences(payment);
    const nextProvider = payment.provider ?? paymentResponse.provider;
    const nextProviderPaymentId =
      payment.providerPaymentId ?? paymentResponse.providerPaymentId;

    await this.ensureProviderPaymentIsUnique(
      nextProvider,
      nextProviderPaymentId,
      id,
    );

    Object.assign(paymentResponse, this.toPaymentEntity(payment));

    if (order) {
      paymentResponse.order = order;
    }

    if (paymentMethod) {
      paymentResponse.paymentMethod = paymentMethod;
    }

    return this.paymentsRepository.save(paymentResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.paymentsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o pagamento');
    }

    return 'Pagamento removido com sucesso';
  }

  private async validateReferences(
    payment: CreatePaymentDto | UpdatePaymentDto,
  ): Promise<{ order?: Order; paymentMethod?: PaymentMethod }> {
    const [order, paymentMethod] = await Promise.all([
      payment.orderId === undefined
        ? undefined
        : this.ordersService.findOne(payment.orderId),
      payment.paymentMethodId === undefined
        ? undefined
        : this.paymentMethodsService.findOne(payment.paymentMethodId),
    ]);

    return { order, paymentMethod };
  }

  private async ensureProviderPaymentIsUnique(
    provider: string,
    providerPaymentId: string,
    excludeId?: number,
  ) {
    const payment = await this.paymentsRepository.findOne({
      where: { provider, providerPaymentId },
    });

    if (payment && payment.id !== excludeId) {
      throw new ConflictException(
        'Este identificador de pagamento já está registrado para o provedor',
      );
    }
  }

  private toPaymentEntity(
    payment: CreatePaymentDto | UpdatePaymentDto,
  ): Partial<Payment> {
    const paymentEntity: Partial<Payment> = {};

    if (payment.provider !== undefined) {
      paymentEntity.provider = payment.provider;
    }

    if (payment.providerPaymentId !== undefined) {
      paymentEntity.providerPaymentId = payment.providerPaymentId;
    }

    if (payment.methodType !== undefined) {
      paymentEntity.methodType = payment.methodType;
    }

    if (payment.amount !== undefined) {
      paymentEntity.amount = String(payment.amount);
    }

    if (payment.currency !== undefined) {
      paymentEntity.currency = payment.currency;
    }

    if (payment.status !== undefined) {
      paymentEntity.status = payment.status;
    }

    if (payment.paymentMethodId !== undefined) {
      paymentEntity.paymentMethodId = payment.paymentMethodId;
    }

    if (payment.orderId !== undefined) {
      paymentEntity.orderId = payment.orderId;
    }

    if (payment.paidAt !== undefined) {
      paymentEntity.paidAt = payment.paidAt;
    }

    return paymentEntity;
  }
}
