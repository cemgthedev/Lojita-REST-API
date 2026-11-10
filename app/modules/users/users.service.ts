import { PaginationResponse } from '@/common/types/pagination-response.type';
import { User } from '@/entities/user.entity';
import { QueryUserDto } from '@/modules/users/dto/query-user.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type UsersResponse = {
  data: User[];
  meta: PaginationResponse;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) readonly usersRepository: Repository<User>,
  ) {}

  async query(query: QueryUserDto) {
    const { name, role, limit, page } = query;
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (name) {
      queryBuilder.andWhere('user.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    const [users, total] = await queryBuilder
      .take(limit ?? 10)
      .skip((page - 1) * (limit ?? 10))
      .getManyAndCount();

    const response: UsersResponse = {
      data: users,
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
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuário de id #${id} não foi encontrado`);
    }

    return user;
  }

  async create(user: CreateUserDto) {
    return `This action create a new user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
