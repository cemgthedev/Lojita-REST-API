import { PaginationResponse } from '@/common/types/pagination-response.type';
import { CouponProduct } from '@/entities/coupon-product.entity';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { ProductsService } from '@/modules/products/products.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponProductDto } from './dto/create-coupon-product.dto';
import { QueryCouponProductDto } from './dto/query-coupon-product.dto';
import { UpdateCouponProductDto } from './dto/update-coupon-product.dto';

export type CouponProductsResponse = {
  data: CouponProduct[];
  meta: PaginationResponse;
};

@Injectable()
export class CouponProductsService {
  constructor(
    @InjectRepository(CouponProduct)
    private readonly couponProductsRepository: Repository<CouponProduct>,
    private readonly couponsService: CouponsService,
    private readonly productsService: ProductsService,
  ) {}

  async create(couponProduct: CreateCouponProductDto) {
    const [coupon, product] = await Promise.all([
      this.couponsService.findOne(couponProduct.couponId),
      this.productsService.findOne(couponProduct.productId),
    ]);

    await this.ensureAssociationDoesNotExist(
      couponProduct.couponId,
      couponProduct.productId,
    );

    const newCouponProduct = this.couponProductsRepository.create({
      couponId: coupon.id,
      productId: product.id,
      coupon,
      product,
    });

    return this.couponProductsRepository.save(newCouponProduct);
  }

  async query(query: QueryCouponProductDto): Promise<CouponProductsResponse> {
    const { couponId, productId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.couponProductsRepository.createQueryBuilder('couponProduct');

    queryBuilder
      .leftJoinAndSelect('couponProduct.coupon', 'coupon')
      .leftJoinAndSelect('couponProduct.product', 'product');

    if (couponId !== undefined) {
      queryBuilder.andWhere('couponProduct.couponId = :couponId', {
        couponId,
      });
    }

    if (productId !== undefined) {
      queryBuilder.andWhere('couponProduct.productId = :productId', {
        productId,
      });
    }

    const [couponProducts, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: couponProducts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(couponId: number, productId: number) {
    const couponProduct = await this.couponProductsRepository.findOne({
      where: { couponId, productId },
      relations: { coupon: true, product: true },
    });

    if (!couponProduct) {
      throw new NotFoundException(
        'Associação entre cupom e produto não foi encontrada',
      );
    }

    return couponProduct;
  }

  async update(
    couponId: number,
    productId: number,
    couponProduct: UpdateCouponProductDto,
  ) {
    await this.findOne(couponId, productId);

    const nextCouponId = couponProduct.couponId ?? couponId;
    const nextProductId = couponProduct.productId ?? productId;

    if (couponProduct.couponId !== undefined) {
      await this.couponsService.findOne(nextCouponId);
    }

    if (couponProduct.productId !== undefined) {
      await this.productsService.findOne(nextProductId);
    }

    await this.ensureAssociationDoesNotExist(
      nextCouponId,
      nextProductId,
      couponId,
      productId,
    );

    const response = await this.couponProductsRepository.update(
      { couponId, productId },
      { couponId: nextCouponId, productId: nextProductId },
    );

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível atualizar a associação entre cupom e produto',
      );
    }

    return this.findOne(nextCouponId, nextProductId);
  }

  async remove(couponId: number, productId: number) {
    await this.findOne(couponId, productId);

    const response = await this.couponProductsRepository.delete({
      couponId,
      productId,
    });

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover a associação entre cupom e produto',
      );
    }

    return 'Associação entre cupom e produto removida com sucesso';
  }

  private async ensureAssociationDoesNotExist(
    couponId: number,
    productId: number,
    currentCouponId?: number,
    currentProductId?: number,
  ) {
    const couponProduct = await this.couponProductsRepository.findOne({
      where: { couponId, productId },
    });

    if (
      couponProduct &&
      (couponProduct.couponId !== currentCouponId ||
        couponProduct.productId !== currentProductId)
    ) {
      throw new ConflictException(
        'Este produto já está associado a este cupom',
      );
    }
  }
}
