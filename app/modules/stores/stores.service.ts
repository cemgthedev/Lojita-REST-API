import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Store } from '@/entities/store.entity';
import { QueryStoreDto } from '@/modules/stores/dto/query-store.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

export type StoresResponse = {
  data: Store[];
  meta: PaginationResponse;
};

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    readonly storesRepository: Repository<Store>,
  ) {}

  create(store: CreateStoreDto) {
    return `This action adds a new store`;
  }

  async query(query: QueryStoreDto) {
    const { name, limit, page } = query;
    const pageLimit = limit ?? 10;
    const currentPage = page ?? 1;
    const queryBuilder = this.storesRepository.createQueryBuilder('store');

    if (name) {
      queryBuilder.andWhere('store.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    const [stores, total] = await queryBuilder
      .take(pageLimit)
      .skip((currentPage - 1) * pageLimit)
      .getManyAndCount();

    const response: StoresResponse = {
      data: stores,
      meta: {
        total,
        limit: pageLimit,
        page: currentPage,
        totalPages: Math.ceil(total / pageLimit),
      },
    };

    return response;
  }

  async findOne(id: number) {
    const store = await this.storesRepository.findOne({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException(`Loja de id #${id} não foi encontrada`);
    }

    return store;
  }

  update(id: number, store: UpdateStoreDto) {
    return `This action updates a #${id} store`;
  }

  remove(id: number) {
    return `This action removes a #${id} store`;
  }
}
