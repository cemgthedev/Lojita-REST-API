import { PaginationResponse } from '@/common/types/pagination-response.type';
import { ProductRating } from '@/entities/product-rating.entity';
import { ProductsService } from '@/modules/products/products.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductRatingDto } from './dto/create-product-rating.dto';
import { QueryProductRatingDto } from './dto/query-product-rating.dto';
import { UpdateProductRatingDto } from './dto/update-product-rating.dto';

export type ProductRatingsResponse = {
  data: ProductRating[];
  meta: PaginationResponse;
};

@Injectable()
export class ProductRatingsService {
  constructor(
    @InjectRepository(ProductRating)
    private readonly productRatingsRepository: Repository<ProductRating>,
    private readonly productsService: ProductsService,
  ) {}

  async create(productRating: CreateProductRatingDto) {
    await this.productsService.findOne(productRating.productId);
    await this.ensureProductDoesNotHaveRating(productRating.productId);

    const newProductRating = this.productRatingsRepository.create(
      this.toProductRatingEntity(productRating),
    );

    return this.productRatingsRepository.save(newProductRating);
  }

  async query(query: QueryProductRatingDto): Promise<ProductRatingsResponse> {
    const { productId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.productRatingsRepository.createQueryBuilder('productRating');

    queryBuilder.leftJoinAndSelect('productRating.product', 'product');

    if (productId !== undefined) {
      queryBuilder.andWhere('productRating.productId = :productId', {
        productId,
      });
    }

    const [ratings, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: ratings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const productRating = await this.productRatingsRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!productRating) {
      throw new NotFoundException(
        `Avaliação agregada de produto de id #${id} não foi encontrada`,
      );
    }

    return productRating;
  }

  async update(id: number, productRating: UpdateProductRatingDto) {
    const productRatingResponse = await this.findOne(id);

    if (productRating.productId !== undefined) {
      await this.productsService.findOne(productRating.productId);
      await this.ensureProductDoesNotHaveRating(productRating.productId, id);
    }

    Object.assign(
      productRatingResponse,
      this.toProductRatingEntity(productRating),
    );

    return this.productRatingsRepository.save(productRatingResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.productRatingsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover a avaliação agregada do produto',
      );
    }

    return 'Avaliação agregada do produto removida com sucesso';
  }

  private toProductRatingEntity(
    productRating: CreateProductRatingDto | UpdateProductRatingDto,
  ): Partial<ProductRating> {
    const productRatingEntity: Partial<ProductRating> = {};

    if (productRating.average !== undefined) {
      productRatingEntity.average = String(productRating.average);
    }

    if (productRating.count !== undefined) {
      productRatingEntity.count = productRating.count;
    }

    if (productRating.fiveStarCount !== undefined) {
      productRatingEntity.fiveStarCount = productRating.fiveStarCount;
    }

    if (productRating.fourStarCount !== undefined) {
      productRatingEntity.fourStarCount = productRating.fourStarCount;
    }

    if (productRating.threeStarCount !== undefined) {
      productRatingEntity.threeStarCount = productRating.threeStarCount;
    }

    if (productRating.twoStarCount !== undefined) {
      productRatingEntity.twoStarCount = productRating.twoStarCount;
    }

    if (productRating.oneStarCount !== undefined) {
      productRatingEntity.oneStarCount = productRating.oneStarCount;
    }

    if (productRating.productId !== undefined) {
      productRatingEntity.productId = productRating.productId;
    }

    return productRatingEntity;
  }

  private async ensureProductDoesNotHaveRating(
    productId: number,
    excludeId?: number,
  ) {
    const existingRating = await this.productRatingsRepository.findOne({
      where: { productId },
    });

    if (existingRating && existingRating.id !== excludeId) {
      throw new ConflictException(
        `O produto de id #${productId} já possui uma avaliação agregada`,
      );
    }
  }
}
