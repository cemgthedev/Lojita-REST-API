import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Specification } from '@/entities/specification.entity';
import { ProductsService } from '@/modules/products/products.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSpecificationDto } from './dto/create-specification.dto';
import { QuerySpecificationDto } from './dto/query-specification.dto';
import { UpdateSpecificationDto } from './dto/update-specification.dto';

export type SpecificationsResponse = {
  data: Specification[];
  meta: PaginationResponse;
};

@Injectable()
export class SpecificationsService {
  constructor(
    @InjectRepository(Specification)
    private readonly specificationsRepository: Repository<Specification>,
    private readonly productsService: ProductsService,
  ) {}

  async create(specification: CreateSpecificationDto) {
    const product = await this.productsService.findOne(specification.productId);
    const newSpecification = this.specificationsRepository.create({
      ...specification,
      product,
    });

    return this.specificationsRepository.save(newSpecification);
  }

  async query(query: QuerySpecificationDto): Promise<SpecificationsResponse> {
    const { name, value, productId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.specificationsRepository.createQueryBuilder('specification');

    if (name) {
      queryBuilder.andWhere('specification.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (value) {
      queryBuilder.andWhere('specification.value ILIKE :value', {
        value: `%${value}%`,
      });
    }

    if (productId !== undefined) {
      queryBuilder.andWhere('specification.productId = :productId', {
        productId,
      });
    }

    const [specifications, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: specifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const specification = await this.specificationsRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!specification) {
      throw new NotFoundException(
        `Especificação de id #${id} não foi encontrada`,
      );
    }

    return specification;
  }

  async update(id: number, specification: UpdateSpecificationDto) {
    const specificationResponse = await this.findOne(id);

    if (specification.productId !== undefined) {
      specificationResponse.product = await this.productsService.findOne(
        specification.productId,
      );
    }

    Object.assign(specificationResponse, specification);

    return this.specificationsRepository.save(specificationResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.specificationsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover a especificação');
    }

    return 'Especificação removida com sucesso';
  }
}
