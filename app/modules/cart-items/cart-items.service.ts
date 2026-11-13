import { PaginationResponse } from '@/common/types/pagination-response.type';
import { CartItem } from '@/entities/cart-items.entity';
import { Cart } from '@/entities/cart.entity';
import { Variant } from '@/entities/variant.entity';
import { CartsService } from '@/modules/carts/carts.service';
import { VariantsService } from '@/modules/variants/variants.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { QueryCartItemDto } from './dto/query-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

export type CartItemsResponse = {
  data: CartItem[];
  meta: PaginationResponse;
};

@Injectable()
export class CartItemsService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,
    private readonly cartsService: CartsService,
    private readonly variantsService: VariantsService,
  ) {}

  async create(cartItem: CreateCartItemDto) {
    await this.validateReferences(cartItem);
    await this.ensureVariantIsNotAlreadyInCart(cartItem.variantId);

    const newCartItem = this.cartItemsRepository.create(cartItem);

    return this.cartItemsRepository.save(newCartItem);
  }

  async query(query: QueryCartItemDto): Promise<CartItemsResponse> {
    const { cartId, variantId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.cartItemsRepository.createQueryBuilder('cartItem');

    queryBuilder
      .leftJoinAndSelect('cartItem.cart', 'cart')
      .leftJoinAndSelect('cartItem.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product');

    if (cartId !== undefined) {
      queryBuilder.andWhere('cartItem.cartId = :cartId', { cartId });
    }

    if (variantId !== undefined) {
      queryBuilder.andWhere('cartItem.variantId = :variantId', { variantId });
    }

    const [cartItems, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: cartItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const cartItem = await this.cartItemsRepository.findOne({
      where: { id },
      relations: { cart: true, variant: { product: true } },
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Item de carrinho de id #${id} não foi encontrado`,
      );
    }

    return cartItem;
  }

  async update(id: number, cartItem: UpdateCartItemDto) {
    const cartItemResponse = await this.findOne(id);
    const { cart, variant } = await this.validateReferences(cartItem);

    const nextVariantId = cartItem.variantId ?? cartItemResponse.variantId;
    await this.ensureVariantIsNotAlreadyInCart(nextVariantId, id);

    Object.assign(cartItemResponse, cartItem);

    if (cart) {
      cartItemResponse.cart = cart;
    }

    if (variant) {
      cartItemResponse.variant = variant;
    }

    return this.cartItemsRepository.save(cartItemResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.cartItemsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o item do carrinho',
      );
    }

    return 'Item do carrinho removido com sucesso';
  }

  private async validateReferences(
    cartItem: UpdateCartItemDto,
  ): Promise<{ cart?: Cart; variant?: Variant }> {
    const [cart, variant] = await Promise.all([
      cartItem.cartId === undefined
        ? undefined
        : this.cartsService.findOne(cartItem.cartId),
      cartItem.variantId === undefined
        ? undefined
        : this.variantsService.findOne(cartItem.variantId),
    ]);

    return { cart, variant };
  }

  private async ensureVariantIsNotAlreadyInCart(
    variantId: number,
    excludeId?: number,
  ) {
    const cartItem = await this.cartItemsRepository.findOne({
      where: { variantId },
    });

    if (cartItem && cartItem.id !== excludeId) {
      throw new ConflictException(
        `A variante de id #${variantId} já está em um item de carrinho`,
      );
    }
  }
}
