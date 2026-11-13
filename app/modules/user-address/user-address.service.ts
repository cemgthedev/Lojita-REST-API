import { PaginationResponse } from '@/common/types/pagination-response.type';
import { UserAddress } from '@/entities/user-address.entity';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { QueryUserAddressDto } from './dto/query-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

export type UserAddressesResponse = {
  data: UserAddress[];
  meta: PaginationResponse;
};

@Injectable()
export class UserAddressService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
    private readonly usersService: UsersService,
  ) {}

  async create(userAddress: CreateUserAddressDto) {
    await this.usersService.findOne(userAddress.userId);

    const newUserAddress = this.userAddressRepository.create(userAddress);

    return this.userAddressRepository.save(newUserAddress);
  }

  async query(query: QueryUserAddressDto): Promise<UserAddressesResponse> {
    const {
      name,
      type,
      cep,
      city,
      state,
      userId,
      limit = 10,
      page = 1,
    } = query;
    const queryBuilder =
      this.userAddressRepository.createQueryBuilder('userAddress');

    if (name) {
      queryBuilder.andWhere('userAddress.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (type) {
      queryBuilder.andWhere('userAddress.type = :type', { type });
    }

    if (cep) {
      queryBuilder.andWhere('userAddress.cep ILIKE :cep', {
        cep: `%${cep}%`,
      });
    }

    if (city) {
      queryBuilder.andWhere('userAddress.city ILIKE :city', {
        city: `%${city}%`,
      });
    }

    if (state) {
      queryBuilder.andWhere('userAddress.state ILIKE :state', {
        state: `%${state}%`,
      });
    }

    if (userId !== undefined) {
      queryBuilder.andWhere('userAddress.userId = :userId', { userId });
    }

    const [userAddresses, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: userAddresses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const userAddress = await this.userAddressRepository.findOne({
      where: { id },
    });

    if (!userAddress) {
      throw new NotFoundException(
        `Endereço de usuário de id #${id} não foi encontrado`,
      );
    }

    return userAddress;
  }

  async update(id: number, userAddress: UpdateUserAddressDto) {
    const userAddressResponse = await this.findOne(id);

    if (userAddress.userId !== undefined) {
      await this.usersService.findOne(userAddress.userId);
    }

    Object.assign(userAddressResponse, userAddress);

    return this.userAddressRepository.save(userAddressResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.userAddressRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o endereço de usuário',
      );
    }

    return 'Endereço de usuário removido com sucesso';
  }
}
