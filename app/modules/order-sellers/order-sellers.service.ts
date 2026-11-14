import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Order } from '@/entities/order.entity';
import { OrderSeller } from '@/entities/order-seller.entity';
import { Store } from '@/entities/store.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import { StoresService } from '@/modules/stores/stores.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderSellerDto } from './dto/create-order-seller.dto';
import { QueryOrderSellerDto } from './dto/query-order-seller.dto';
import { UpdateOrderSellerDto } from './dto/update-order-seller.dto';

export type OrderSellersResponse = {
  data: OrderSeller[];
  meta: PaginationResponse;
};

@Injectable()
export class OrderSellersService {
  constructor(
    @InjectRepository(OrderSeller)
    private readonly orderSellersRepository: Repository<OrderSeller>,
    private readonly ordersService: OrdersService,
    private readonly storesService: StoresService,
  ) {}

  async create(orderSeller: CreateOrderSellerDto) {
    await this.validateReferences(orderSeller);

    const newOrderSeller = this.orderSellersRepository.create(
      this.toOrderSellerEntity(orderSeller),
    );

    return this.orderSellersRepository.save(newOrderSeller);
  }

  async query(query: QueryOrderSellerDto): Promise<OrderSellersResponse> {
    const { status, orderId, storeId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.orderSellersRepository.createQueryBuilder('orderSeller');

    queryBuilder
      .leftJoinAndSelect('orderSeller.order', 'order')
      .leftJoinAndSelect('orderSeller.store', 'store');

    if (status) {
      queryBuilder.andWhere('orderSeller.status = :status', { status });
    }

    if (orderId !== undefined) {
      queryBuilder.andWhere('orderSeller.orderId = :orderId', { orderId });
    }

    if (storeId !== undefined) {
      queryBuilder.andWhere('orderSeller.storeId = :storeId', { storeId });
    }

    const [orderSellers, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: orderSellers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const orderSeller = await this.orderSellersRepository.findOne({
      where: { id },
      relations: { order: true, store: true },
    });

    if (!orderSeller) {
      throw new NotFoundException(
        `Vendedor do pedido de id #${id} não foi encontrado`,
      );
    }

    return orderSeller;
  }

  async update(id: number, orderSeller: UpdateOrderSellerDto) {
    const orderSellerResponse = await this.findOne(id);
    const { order, store } = await this.validateReferences(orderSeller);

    Object.assign(orderSellerResponse, this.toOrderSellerEntity(orderSeller));

    if (order) {
      orderSellerResponse.order = order;
    }

    if (store) {
      orderSellerResponse.store = store;
    }

    return this.orderSellersRepository.save(orderSellerResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.orderSellersRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o vendedor do pedido',
      );
    }

    return 'Vendedor do pedido removido com sucesso';
  }

  private async validateReferences(
    orderSeller: CreateOrderSellerDto | UpdateOrderSellerDto,
  ): Promise<{ order?: Order; store?: Store }> {
    const [order, store] = await Promise.all([
      orderSeller.orderId === undefined
        ? undefined
        : this.ordersService.findOne(orderSeller.orderId),
      orderSeller.storeId === undefined
        ? undefined
        : this.storesService.findOne(orderSeller.storeId),
    ]);

    return { order, store };
  }

  private toOrderSellerEntity(
    orderSeller: CreateOrderSellerDto | UpdateOrderSellerDto,
  ): Partial<OrderSeller> {
    const orderSellerEntity: Partial<OrderSeller> = {};

    if (orderSeller.status !== undefined) {
      orderSellerEntity.status = orderSeller.status;
    }

    if (orderSeller.subtotal !== undefined) {
      orderSellerEntity.subtotal = String(orderSeller.subtotal);
    }

    if (orderSeller.total !== undefined) {
      orderSellerEntity.total = String(orderSeller.total);
    }

    if (orderSeller.shippingTotal !== undefined) {
      orderSellerEntity.shippingTotal = String(orderSeller.shippingTotal);
    }

    if (orderSeller.discountTotal !== undefined) {
      orderSellerEntity.discountTotal = String(orderSeller.discountTotal);
    }

    if (orderSeller.storeId !== undefined) {
      orderSellerEntity.storeId = orderSeller.storeId;
    }

    if (orderSeller.orderId !== undefined) {
      orderSellerEntity.orderId = orderSeller.orderId;
    }

    if (orderSeller.sortOrder !== undefined) {
      orderSellerEntity.sortOrder = orderSeller.sortOrder;
    }

    return orderSellerEntity;
  }
}
