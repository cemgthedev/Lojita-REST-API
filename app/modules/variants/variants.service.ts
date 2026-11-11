import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Variant } from '@/entities/variant.entity';
import { ProductsService } from '@/modules/products/products.service';
import { QueryVariantDto } from '@/modules/variants/dto/query-variant.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

export type VariantsResponse = {
  data: Variant[];
  meta: PaginationResponse;
};

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(Variant)
    private readonly variantsRepository: Repository<Variant>,
    private readonly productsService: ProductsService,
  ) {}

  async create(variant: CreateVariantDto) {
    await this.productsService.findOne(variant.productId);

    const newVariant = this.variantsRepository.create(variant);

    return this.variantsRepository.save(newVariant);
  }

  async query(query: QueryVariantDto): Promise<VariantsResponse> {
    const { productId, sku, status, limit = 10, page = 1 } = query;
    const queryBuilder = this.variantsRepository.createQueryBuilder('variant');

    queryBuilder.leftJoinAndSelect('variant.product', 'product');

    if (productId !== undefined) {
      queryBuilder.andWhere('variant.productId = :productId', { productId });
    }

    if (sku) {
      queryBuilder.andWhere('variant.sku ILIKE :sku', {
        sku: `%${sku}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('variant.status = :status', { status });
    }

    const [variants, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: variants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const variant = await this.variantsRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!variant) {
      throw new NotFoundException(`Variante de id #${id} não foi encontrada`);
    }

    return variant;
  }

  async update(id: number, variant: UpdateVariantDto) {
    const variantResponse = await this.findOne(id);

    if (variant.productId !== undefined) {
      await this.productsService.findOne(variant.productId);
    }

    Object.assign(variantResponse, variant);

    return this.variantsRepository.save(variantResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.variantsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover a variante');
    }

    return 'Variante removida com sucesso';
  }
}
