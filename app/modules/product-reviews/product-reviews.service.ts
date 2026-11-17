import { PaginationResponse } from '@/common/types/pagination-response.type';
import { ProductReview } from '@/entities/product-review.entity';
import { ProductsService } from '@/modules/products/products.service';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { QueryProductReviewDto } from './dto/query-product-review.dto';
import { UpdateProductReviewDto } from './dto/update-product-review.dto';

export type ProductReviewsResponse = {
  data: ProductReview[];
  meta: PaginationResponse;
};

@Injectable()
export class ProductReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly productReviewsRepository: Repository<ProductReview>,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  async create(productReview: CreateProductReviewDto) {
    await this.validateReferences(productReview);

    const newProductReview =
      this.productReviewsRepository.create(productReview);

    return this.productReviewsRepository.save(newProductReview);
  }

  async query(query: QueryProductReviewDto): Promise<ProductReviewsResponse> {
    const { rating, status, userId, productId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.productReviewsRepository.createQueryBuilder('productReview');

    queryBuilder
      .leftJoinAndSelect('productReview.user', 'user')
      .leftJoinAndSelect('productReview.product', 'product');

    if (rating !== undefined) {
      queryBuilder.andWhere('productReview.rating = :rating', { rating });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('productReview.status = :status', { status });
    }

    if (userId !== undefined) {
      queryBuilder.andWhere('productReview.userId = :userId', { userId });
    }

    if (productId !== undefined) {
      queryBuilder.andWhere('productReview.productId = :productId', {
        productId,
      });
    }

    const [reviews, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const productReview = await this.productReviewsRepository.findOne({
      where: { id },
      relations: { user: true, product: true },
    });

    if (!productReview) {
      throw new NotFoundException(
        `Avaliação de produto de id #${id} não foi encontrada`,
      );
    }

    return productReview;
  }

  async update(id: number, productReview: UpdateProductReviewDto) {
    const productReviewResponse = await this.findOne(id);

    await this.validateReferences(productReview);
    Object.assign(productReviewResponse, productReview);

    return this.productReviewsRepository.save(productReviewResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.productReviewsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover a avaliação');
    }

    return 'Avaliação removida com sucesso';
  }

  private async validateReferences(
    productReview: CreateProductReviewDto | UpdateProductReviewDto,
  ) {
    if (productReview.userId !== undefined) {
      await this.usersService.findOne(productReview.userId);
    }

    if (productReview.productId !== undefined) {
      await this.productsService.findOne(productReview.productId);
    }
  }
}
