import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Order } from '@/entities/order.entity';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

export type OrdersResponse = {
  data: Order[];
  meta: PaginationResponse;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly usersService: UsersService,
  ) {}

  async create(order: CreateOrderDto) {
    await this.usersService.findOne(order.userId);

    const newOrder = this.ordersRepository.create(this.toOrderEntity(order));

    return this.ordersRepository.save(newOrder);
  }

  async query(query: QueryOrderDto): Promise<OrdersResponse> {
    const { userId, status, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.ordersRepository.createQueryBuilder('orderEntity');

    if (userId !== undefined) {
      queryBuilder.andWhere('orderEntity.userId = :userId', { userId });
    }

    if (status) {
      queryBuilder.andWhere('orderEntity.status = :status', { status });
    }

    const [orders, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Pedido de id #${id} não foi encontrado`);
    }

    return order;
  }

  async update(id: number, order: UpdateOrderDto) {
    const orderResponse = await this.findOne(id);

    if (order.userId !== undefined) {
      await this.usersService.findOne(order.userId);
    }

    Object.assign(orderResponse, this.toOrderEntity(order));

    return this.ordersRepository.save(orderResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.ordersRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o pedido');
    }

    return 'Pedido removido com sucesso';
  }

  private toOrderEntity(
    order: CreateOrderDto | UpdateOrderDto,
  ): Partial<Order> {
    const orderEntity: Partial<Order> = {};

    if (order.userId !== undefined) {
      orderEntity.userId = order.userId;
    }

    if (order.status !== undefined) {
      orderEntity.status = order.status;
    }

    if (order.subtotal !== undefined) {
      orderEntity.subtotal = String(order.subtotal);
    }

    if (order.shippingTotal !== undefined) {
      orderEntity.shippingTotal = String(order.shippingTotal);
    }

    if (order.discountTotal !== undefined) {
      orderEntity.discountTotal = String(order.discountTotal);
    }

    if (order.total !== undefined) {
      orderEntity.total = String(order.total);
    }

    return orderEntity;
  }
}
