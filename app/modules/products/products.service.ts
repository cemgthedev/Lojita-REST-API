import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Product } from '@/entities/product.entity';
import { CategoriesService } from '@/modules/categories/categories.service';
import { CreateProductDto } from '@/modules/products/dto/create-product.dto';
import { QueryProductDto } from '@/modules/products/dto/query-product.dto';
import { UpdateProductDto } from '@/modules/products/dto/update-product.dto';
import { StoresService } from '@/modules/stores/stores.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export type ProductsResponse = {
  data: Product[];
  meta: PaginationResponse;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly storesService: StoresService,
  ) {}

  async create(product: CreateProductDto) {
    const [category, store] = await Promise.all([
      product.categoryId === undefined
        ? undefined
        : this.categoriesService.findOne(product.categoryId),
      product.storeId === undefined
        ? undefined
        : this.storesService.findOne(product.storeId),
    ]);

    const newProduct = this.productsRepository.create({
      ...product,
      category,
      store,
    });

    return this.productsRepository.save(newProduct);
  }

  async query(query: QueryProductDto): Promise<ProductsResponse> {
    const { title, categoryId, storeId, limit = 10, page = 1 } = query;
    const queryBuilder = this.productsRepository.createQueryBuilder('product');

    queryBuilder
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.store', 'store')
      .leftJoinAndSelect('product.defaultVariant', 'variant');

    if (title) {
      queryBuilder.andWhere('product.title ILIKE :title', {
        title: `%${title}%`,
      });
    }

    if (categoryId !== undefined) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId,
      });
    }

    if (storeId !== undefined) {
      queryBuilder.andWhere('product.storeId = :storeId', { storeId });
    }

    const [products, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { category: true, store: true },
    });

    if (!product) {
      throw new NotFoundException(`Produto de id #${id} não foi encontrado`);
    }

    return product;
  }

  async update(id: number, product: UpdateProductDto) {
    const productResponse = await this.findOne(id);

    const [category, store] = await Promise.all([
      product.categoryId === undefined
        ? undefined
        : this.categoriesService.findOne(product.categoryId),
      product.storeId === undefined
        ? undefined
        : this.storesService.findOne(product.storeId),
    ]);

    Object.assign(productResponse, product);

    if (product.categoryId !== undefined) {
      productResponse.category = category;
    }

    if (product.storeId !== undefined) {
      productResponse.store = store;
    }

    return this.productsRepository.save(productResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.productsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o produto');
    }

    return 'Produto removido com sucesso';
  }
}
