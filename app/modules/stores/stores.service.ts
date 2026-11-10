import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Store } from '@/entities/store.entity';
import { QueryStoreDto } from '@/modules/stores/dto/query-store.dto';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
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
    private readonly usersService: UsersService,
  ) {}

  async create(store: CreateStoreDto) {
    await this.usersService.findOne(store.userId);

    const userStoreRegistered = await this.storesRepository.exists({
      where: { userId: store.userId },
    });

    if (userStoreRegistered) {
      throw new ConflictException(
        `O usuário de id #${store.userId} já possui uma loja cadastrada`,
      );
    }

    const nicknameRegistered = await this.storesRepository.exists({
      where: { nickname: store.nickname },
    });

    if (nicknameRegistered) {
      throw new ConflictException(
        `O apelido '${store.nickname}' já foi cadastrado`,
      );
    }

    const newStore: Store = this.storesRepository.create(store);

    return this.storesRepository.save(newStore);
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

  async update(id: number, store: UpdateStoreDto) {
    const storeResponse: Store = await this.findOne(id);

    if (
      store.nickname !== undefined &&
      store.nickname !== storeResponse.nickname
    ) {
      const nicknameRegistered = await this.storesRepository.exists({
        where: {
          nickname: store.nickname,
          id: Not(id),
        },
      });

      if (nicknameRegistered) {
        throw new ConflictException(
          `O apelido '${store.nickname}' já foi cadastrado`,
        );
      }
    }

    Object.assign(storeResponse, store);

    return this.storesRepository.save(storeResponse);
  }

  remove(id: number) {
    return `This action removes a #${id} store`;
  }
}
