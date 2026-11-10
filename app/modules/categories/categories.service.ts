import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Category } from '@/entities/category.entity';
import { QueryCategoryDto } from '@/modules/categories/dto/query-category.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export type CategoriesResponse = {
  data: Category[];
  meta: PaginationResponse;
};

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(category: CreateCategoryDto) {
    const titleRegistered = await this.categoriesRepository.exists({
      where: { title: category.title },
    });

    if (titleRegistered) {
      throw new ConflictException(
        `A categoria '${category.title}' já foi cadastrada`,
      );
    }

    const newCategory = this.categoriesRepository.create(category);

    return this.categoriesRepository.save(newCategory);
  }

  async query(query: QueryCategoryDto) {
    const { title, limit, page } = query;
    const queryBuilder =
      this.categoriesRepository.createQueryBuilder('category');

    if (title) {
      queryBuilder.andWhere('category.title ILIKE :title', {
        title: `%${title}%`,
      });
    }

    const [categories, total] = await queryBuilder
      .take(limit ?? 10)
      .skip((page - 1) * (limit ?? 10))
      .getManyAndCount();

    const response: CategoriesResponse = {
      data: categories,
      meta: {
        total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };

    return response;
  }

  async findOne(id: number) {
    const category: Category | null = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoria de id #${id} não foi encontrada`);
    }

    return category;
  }

  async update(id: number, category: UpdateCategoryDto) {
    const categoryResponse: Category | null = await this.findOne(id);

    if (!categoryResponse) {
      throw new NotFoundException(`Categoria não foi encontrada`);
    }

    Object.assign(categoryResponse, category);

    return this.categoriesRepository.save(categoryResponse);
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
