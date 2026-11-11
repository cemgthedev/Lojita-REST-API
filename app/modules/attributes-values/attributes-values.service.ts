import { PaginationResponse } from '@/common/types/pagination-response.type';
import { AttributeValue } from '@/entities/attribute-value.entity';
import { CreateAttributesValueDto } from '@/modules/attributes-values/dto/create-attributes-value.dto';
import { QueryAttributesValueDto } from '@/modules/attributes-values/dto/query-attributes-value.dto';
import { UpdateAttributesValueDto } from '@/modules/attributes-values/dto/update-attributes-value.dto';
import { AttributesService } from '@/modules/attributes/attribute.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export type AttributesValuesResponse = {
  data: AttributeValue[];
  meta: PaginationResponse;
};

@Injectable()
export class AttributesValuesService {
  constructor(
    @InjectRepository(AttributeValue)
    private readonly attributesValuesRepository: Repository<AttributeValue>,
    private readonly attributesService: AttributesService,
  ) {}

  async create(attributesValue: CreateAttributesValueDto) {
    const attribute = await this.attributesService.findOne(
      attributesValue.attributeId,
    );

    const newAttributesValue = this.attributesValuesRepository.create({
      ...attributesValue,
      attribute,
    });

    return this.attributesValuesRepository.save(newAttributesValue);
  }

  async query(
    query: QueryAttributesValueDto,
  ): Promise<AttributesValuesResponse> {
    const { attributeId, title, value, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.attributesValuesRepository.createQueryBuilder('attributesValue');

    queryBuilder.leftJoinAndSelect('attributesValue.attribute', 'attribute');

    if (attributeId !== undefined) {
      queryBuilder.andWhere('attributesValue.attributeId = :attributeId', {
        attributeId,
      });
    }

    if (title) {
      queryBuilder.andWhere('attributesValue.title ILIKE :title', {
        title: `%${title}%`,
      });
    }

    if (value) {
      queryBuilder.andWhere('attributesValue.value ILIKE :value', {
        value: `%${value}%`,
      });
    }

    const [attributesValues, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: attributesValues,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const attributesValue = await this.attributesValuesRepository.findOne({
      where: { id },
      relations: { attribute: true },
    });

    if (!attributesValue) {
      throw new NotFoundException(
        `Valor de atributo de id #${id} não foi encontrado`,
      );
    }

    return attributesValue;
  }

  async update(id: number, attributesValue: UpdateAttributesValueDto) {
    const attributesValueResponse = await this.findOne(id);

    if (attributesValue.attributeId !== undefined) {
      attributesValueResponse.attribute = await this.attributesService.findOne(
        attributesValue.attributeId,
      );
    }

    Object.assign(attributesValueResponse, attributesValue);

    return this.attributesValuesRepository.save(attributesValueResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.attributesValuesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o valor do atributo',
      );
    }

    return 'Valor do atributo removido com sucesso';
  }
}
