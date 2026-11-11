import { PaginationResponse } from '@/common/types/pagination-response.type';
import { User } from '@/entities/user.entity';
import { QueryUserDto } from '@/modules/users/dto/query-user.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async create(user: CreateUserDto) {
    const emailRegistered: boolean = await this.usersRepository.exists({
      where: { email: user.email },
    });

    if (emailRegistered) {
      throw new ConflictException(`O email ${user.email} já foi cadastrado`);
    }

    const cpfRegistered: boolean = await this.usersRepository.exists({
      where: { cpf: user.cpf },
    });

    if (cpfRegistered) {
      throw new ConflictException('CPF já cadastrado');
    }

    const newUser: User = this.usersRepository.create(user);

    return this.usersRepository.save(newUser);
  }

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
    const user: User | null = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário de id #${id} não foi encontrado`);
    }

    return user;
  }

  async update(id: number, user: UpdateUserDto) {
    const userResponse: User = await this.findOne(id);

    if (!userResponse) {
      throw new NotFoundException(`Usuário não foi encontrado`);
    }

    Object.assign(userResponse, user);

    const response: User = await this.usersRepository.save(userResponse);

    return response;
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.usersRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(`Não foi possível remover a conta`);
    }

    return `Conta removida com sucesso`;
  }
}
