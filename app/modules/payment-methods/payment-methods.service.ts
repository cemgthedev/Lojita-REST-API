import { PaginationResponse } from '@/common/types/pagination-response.type';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { User } from '@/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { QueryPaymentMethodDto } from './dto/query-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

export type PaymentMethodsResponse = {
  data: PaymentMethod[];
  meta: PaginationResponse;
};

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodsRepository: Repository<PaymentMethod>,
    private readonly usersService: UsersService,
  ) {}

  async create(paymentMethod: CreatePaymentMethodDto) {
    await this.usersService.findOne(paymentMethod.userId);

    const newPaymentMethod = this.paymentMethodsRepository.create(paymentMethod);

    return this.paymentMethodsRepository.save(newPaymentMethod);
  }

  async query(query: QueryPaymentMethodDto): Promise<PaymentMethodsResponse> {
    const { type, method, provider, userId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.paymentMethodsRepository.createQueryBuilder('paymentMethod');

    queryBuilder.leftJoinAndSelect('paymentMethod.user', 'user');

    if (type) {
      queryBuilder.andWhere('paymentMethod.type = :type', { type });
    }

    if (method) {
      queryBuilder.andWhere('paymentMethod.method ILIKE :method', {
        method: `%${method}%`,
      });
    }

    if (provider) {
      queryBuilder.andWhere('paymentMethod.provider ILIKE :provider', {
        provider: `%${provider}%`,
      });
    }

    if (userId !== undefined) {
      queryBuilder.andWhere('paymentMethod.userId = :userId', { userId });
    }

    const [paymentMethods, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: paymentMethods,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const paymentMethod = await this.paymentMethodsRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException(
        `Método de pagamento de id #${id} não foi encontrado`,
      );
    }

    return paymentMethod;
  }

  async update(id: number, paymentMethod: UpdatePaymentMethodDto) {
    const paymentMethodResponse = await this.findOne(id);

    if (paymentMethod.userId !== undefined) {
      await this.usersService.findOne(paymentMethod.userId);
    }

    Object.assign(paymentMethodResponse, paymentMethod);

    return this.paymentMethodsRepository.save(paymentMethodResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.paymentMethodsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o método de pagamento',
      );
    }

    return 'Método de pagamento removido com sucesso';
  }
}
