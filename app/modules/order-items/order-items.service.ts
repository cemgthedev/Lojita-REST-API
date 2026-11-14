import { PaginationResponse } from '@/common/types/pagination-response.type';
import { OrderItem } from '@/entities/order-item.entity';
import { Order } from '@/entities/order.entity';
import { User } from '@/entities/user.entity';
import { Variant } from '@/entities/variant.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import { UsersService } from '@/modules/users/users.service';
import { VariantsService } from '@/modules/variants/variants.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { QueryOrderItemDto } from './dto/query-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

export type OrderItemsResponse = {
  data: OrderItem[];
  meta: PaginationResponse;
};

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly ordersService: OrdersService,
    private readonly variantsService: VariantsService,
    private readonly usersService: UsersService,
  ) {}

  async create(orderItem: CreateOrderItemDto) {
    await this.validateReferences(orderItem);

    const newOrderItem = this.orderItemsRepository.create(
      this.toOrderItemEntity(orderItem),
    );

    return this.orderItemsRepository.save(newOrderItem);
  }

  async query(query: QueryOrderItemDto): Promise<OrderItemsResponse> {
    const { orderId, variantId, orderSellerId, limit = 10, page = 1 } = query;
    const queryBuilder = this.orderItemsRepository.createQueryBuilder('orderItem');

    queryBuilder
      .leftJoinAndSelect('orderItem.order', 'order')
      .leftJoinAndSelect('orderItem.variant', 'variant')
      .leftJoinAndSelect('orderItem.orderSeller', 'orderSeller');

    if (orderId !== undefined) {
      queryBuilder.andWhere('orderItem.orderId = :orderId', { orderId });
    }

    if (variantId !== undefined) {
      queryBuilder.andWhere('orderItem.variantId = :variantId', { variantId });
    }

    if (orderSellerId !== undefined) {
      queryBuilder.andWhere('orderItem.orderSellerId = :orderSellerId', {
        orderSellerId,
      });
    }

    const [orderItems, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: orderItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const orderItem = await this.orderItemsRepository.findOne({
      where: { id },
      relations: { order: true, variant: true, orderSeller: true },
    });

    if (!orderItem) {
      throw new NotFoundException(
        `Item do pedido de id #${id} não foi encontrado`,
      );
    }

    return orderItem;
  }

  async update(id: number, orderItem: UpdateOrderItemDto) {
    const orderItemResponse = await this.findOne(id);
    const { order, variant, orderSeller } = await this.validateReferences(
      orderItem,
    );

    Object.assign(orderItemResponse, this.toOrderItemEntity(orderItem));

    if (order) {
      orderItemResponse.order = order;
    }

    if (variant) {
      orderItemResponse.variant = variant;
    }

    if (orderSeller) {
      orderItemResponse.orderSeller = orderSeller;
    }

    return this.orderItemsRepository.save(orderItemResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.orderItemsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o item do pedido');
    }

    return 'Item do pedido removido com sucesso';
  }

  private async validateReferences(
    orderItem: CreateOrderItemDto | UpdateOrderItemDto,
  ): Promise<{ order?: Order; variant?: Variant; orderSeller?: User }> {
    const [order, variant, orderSeller] = await Promise.all([
      orderItem.orderId === undefined
        ? undefined
        : this.ordersService.findOne(orderItem.orderId),
      orderItem.variantId === undefined
        ? undefined
        : this.variantsService.findOne(orderItem.variantId),
      orderItem.orderSellerId === undefined
        ? undefined
        : this.usersService.findOne(orderItem.orderSellerId),
    ]);

    return { order, variant, orderSeller };
  }

  private toOrderItemEntity(
    orderItem: CreateOrderItemDto | UpdateOrderItemDto,
  ): Partial<OrderItem> {
    const orderItemEntity: Partial<OrderItem> = {};

    if (orderItem.quantity !== undefined) {
      orderItemEntity.quantity = orderItem.quantity;
    }

    if (orderItem.unitPrice !== undefined) {
      orderItemEntity.unitPrice = String(orderItem.unitPrice);
    }

    if (orderItem.productName !== undefined) {
      orderItemEntity.productName = orderItem.productName;
    }

    if (orderItem.sku !== undefined) {
      orderItemEntity.sku = orderItem.sku;
    }

    if (orderItem.subtotal !== undefined) {
      orderItemEntity.subtotal = String(orderItem.subtotal);
    }

    if (orderItem.orderId !== undefined) {
      orderItemEntity.orderId = orderItem.orderId;
    }

    if (orderItem.variantId !== undefined) {
      orderItemEntity.variantId = orderItem.variantId;
    }

    if (orderItem.orderSellerId !== undefined) {
      orderItemEntity.orderSellerId = orderItem.orderSellerId;
    }

    return orderItemEntity;
  }
}
