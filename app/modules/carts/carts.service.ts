import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Cart } from '@/entities/cart.entity';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCartDto } from './dto/create-cart.dto';
import { QueryCartDto } from './dto/query-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

export type CartsResponse = {
  data: Cart[];
  meta: PaginationResponse;
};

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,
    private readonly usersService: UsersService,
  ) {}

  async create(cart: CreateCartDto) {
    await this.usersService.findOne(cart.userId);
    await this.ensureUserDoesNotHaveCart(cart.userId);

    const newCart = this.cartsRepository.create(cart);

    return this.cartsRepository.save(newCart);
  }

  async query(query: QueryCartDto): Promise<CartsResponse> {
    const { userId, limit = 10, page = 1 } = query;
    const queryBuilder = this.cartsRepository.createQueryBuilder('cart');

    if (userId !== undefined) {
      queryBuilder.andWhere('cart.userId = :userId', { userId });
    }

    const [carts, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: carts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const cart = await this.cartsRepository.findOne({ where: { id } });

    if (!cart) {
      throw new NotFoundException(`Carrinho de id #${id} não foi encontrado`);
    }

    return cart;
  }

  async update(id: number, cart: UpdateCartDto) {
    const cartResponse = await this.findOne(id);

    if (cart.userId !== undefined) {
      await this.usersService.findOne(cart.userId);
      await this.ensureUserDoesNotHaveCart(cart.userId, id);
    }

    Object.assign(cartResponse, cart);

    return this.cartsRepository.save(cartResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.cartsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o carrinho');
    }

    return 'Carrinho removido com sucesso';
  }

  private async ensureUserDoesNotHaveCart(userId: number, excludeId?: number) {
    const cart = await this.cartsRepository.findOne({ where: { userId } });

    if (cart && cart.id !== excludeId) {
      throw new ConflictException(
        `O usuário de id #${userId} já possui um carrinho`,
      );
    }
  }
}
