import { PaginationResponse } from '@/common/types/pagination-response.type';
import { VariantAttribute } from '@/entities/variant-attribute.entity';
import { AttributesValuesService } from '@/modules/attributes-values/attributes-values.service';
import { VariantsService } from '@/modules/variants/variants.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto';
import { QueryVariantAttributeDto } from './dto/query-variant-attribute.dto';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto';

export type VariantAttributesResponse = {
  data: VariantAttribute[];
  meta: PaginationResponse;
};

@Injectable()
export class VariantAttributesService {
  constructor(
    @InjectRepository(VariantAttribute)
    private readonly variantAttributesRepository: Repository<VariantAttribute>,
    private readonly variantsService: VariantsService,
    private readonly attributesValuesService: AttributesValuesService,
  ) {}

  async create(variantAttribute: CreateVariantAttributeDto) {
    await this.variantsService.findOne(variantAttribute.variantId);
    await this.attributesValuesService.findOne(
      variantAttribute.attributeValueId,
    );

    const exists = await this.variantAttributesRepository.exists({
      where: {
        variantId: variantAttribute.variantId,
        attributeValueId: variantAttribute.attributeValueId,
      },
    });

    if (exists) {
      throw new ConflictException(
        'Esta associação entre variante e valor de atributo já existe',
      );
    }

    const newVariantAttribute =
      this.variantAttributesRepository.create(variantAttribute);

    return this.variantAttributesRepository.save(newVariantAttribute);
  }

  async query(
    query: QueryVariantAttributeDto,
  ): Promise<VariantAttributesResponse> {
    const { variantId, attributeValueId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.variantAttributesRepository.createQueryBuilder('variantAttribute');

    queryBuilder.leftJoinAndSelect(
      'variantAttribute.attributeValue',
      'attributeValue',
    );
    queryBuilder.leftJoinAndSelect('attributeValue.attribute', 'attribute');

    if (variantId !== undefined) {
      queryBuilder.andWhere('variantAttribute.variantId = :variantId', {
        variantId,
      });
    }

    if (attributeValueId !== undefined) {
      queryBuilder.andWhere(
        'variantAttribute.attributeValueId = :attributeValueId',
        { attributeValueId },
      );
    }

    const [variantAttributes, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: variantAttributes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const variantAttribute = await this.variantAttributesRepository.findOne({
      where: { id },
      relations: {
        variant: true,
        attributeValue: { attribute: true },
      },
    });

    if (!variantAttribute) {
      throw new NotFoundException(
        `Atributo de variante de id #${id} não foi encontrado`,
      );
    }

    return variantAttribute;
  }

  async update(id: number, variantAttribute: UpdateVariantAttributeDto) {
    const variantAttributeResponse = await this.findOne(id);

    if (variantAttribute.variantId !== undefined) {
      await this.variantsService.findOne(variantAttribute.variantId);
    }

    if (variantAttribute.attributeValueId !== undefined) {
      await this.attributesValuesService.findOne(
        variantAttribute.attributeValueId,
      );
    }

    const nextVariantId =
      variantAttribute.variantId ?? variantAttributeResponse.variantId;
    const nextAttributeValueId =
      variantAttribute.attributeValueId ??
      variantAttributeResponse.attributeValueId;

    const duplicate = await this.variantAttributesRepository.findOne({
      where: {
        variantId: nextVariantId,
        attributeValueId: nextAttributeValueId,
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(
        'Esta associação entre variante e valor de atributo já existe',
      );
    }

    Object.assign(variantAttributeResponse, variantAttribute);

    return this.variantAttributesRepository.save(variantAttributeResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.variantAttributesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o atributo da variante',
      );
    }

    return 'Atributo da variante removido com sucesso';
  }
}
