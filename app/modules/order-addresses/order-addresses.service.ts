import { PaginationResponse } from '@/common/types/pagination-response.type';
import { OrderAddress } from '@/entities/order-address.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderAddressDto } from './dto/create-order-address.dto';
import { QueryOrderAddressDto } from './dto/query-order-address.dto';
import { UpdateOrderAddressDto } from './dto/update-order-address.dto';

export type OrderAddressesResponse = {
  data: OrderAddress[];
  meta: PaginationResponse;
};

@Injectable()
export class OrderAddressesService {
  constructor(
    @InjectRepository(OrderAddress)
    private readonly orderAddressesRepository: Repository<OrderAddress>,
    private readonly ordersService: OrdersService,
  ) {}

  async create(orderAddress: CreateOrderAddressDto) {
    await this.ordersService.findOne(orderAddress.orderId);

    const newOrderAddress = this.orderAddressesRepository.create(orderAddress);

    return this.orderAddressesRepository.save(newOrderAddress);
  }

  async query(query: QueryOrderAddressDto): Promise<OrderAddressesResponse> {
    const {
      name,
      type,
      cep,
      city,
      state,
      orderId,
      recipientName,
      limit = 10,
      page = 1,
    } = query;
    const queryBuilder =
      this.orderAddressesRepository.createQueryBuilder('orderAddress');

    if (name) {
      queryBuilder.andWhere('orderAddress.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (type) {
      queryBuilder.andWhere('orderAddress.type = :type', { type });
    }

    if (cep) {
      queryBuilder.andWhere('orderAddress.cep ILIKE :cep', {
        cep: `%${cep}%`,
      });
    }

    if (city) {
      queryBuilder.andWhere('orderAddress.city ILIKE :city', {
        city: `%${city}%`,
      });
    }

    if (state) {
      queryBuilder.andWhere('orderAddress.state ILIKE :state', {
        state: `%${state}%`,
      });
    }

    if (orderId !== undefined) {
      queryBuilder.andWhere('orderAddress.orderId = :orderId', { orderId });
    }

    if (recipientName) {
      queryBuilder.andWhere('orderAddress.recipientName ILIKE :recipientName', {
        recipientName: `%${recipientName}%`,
      });
    }

    const [orderAddresses, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: orderAddresses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const orderAddress = await this.orderAddressesRepository.findOne({
      where: { id },
      relations: { order: true },
    });

    if (!orderAddress) {
      throw new NotFoundException(
        `Endereço do pedido de id #${id} não foi encontrado`,
      );
    }

    return orderAddress;
  }

  async update(id: number, orderAddress: UpdateOrderAddressDto) {
    const orderAddressResponse = await this.findOne(id);

    if (orderAddress.orderId !== undefined) {
      await this.ordersService.findOne(orderAddress.orderId);
    }

    Object.assign(orderAddressResponse, orderAddress);

    return this.orderAddressesRepository.save(orderAddressResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.orderAddressesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o endereço do pedido',
      );
    }

    return 'Endereço do pedido removido com sucesso';
  }
}
