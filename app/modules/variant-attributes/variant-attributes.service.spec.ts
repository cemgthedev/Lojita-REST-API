jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { AttributeValue } from '@/entities/attribute-value.entity';
import { Variant } from '@/entities/variant.entity';
import { VariantAttribute } from '@/entities/variant-attribute.entity';
import { CreateVariantAttributeDto } from '@/modules/variant-attributes/dto/create-variant-attribute.dto';
import { QueryVariantAttributeDto } from '@/modules/variant-attributes/dto/query-variant-attribute.dto';
import { AttributesValuesService } from '@/modules/attributes-values/attributes-values.service';
import { VariantsService } from '@/modules/variants/variants.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { VariantAttributesService } from './variant-attributes.service';

describe('VariantAttributesService', () => {
  let service: VariantAttributesService;
  let repository: jest.Mocked<Repository<VariantAttribute>>;
  let variantsService: jest.Mocked<VariantsService>;
  let attributesValuesService: jest.Mocked<AttributesValuesService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<VariantAttribute>>;

  const variantAttributeDto: CreateVariantAttributeDto = {
    variantId: 3,
    attributeValueId: 5,
  };

  const createVariantAttribute = (): VariantAttribute => ({
    id: 1,
    ...variantAttributeDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const variant: Variant = {
    id: 3,
    price: 99.99,
    stock: 5,
    status: STATUS.ACTIVE,
    productId: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const attributeValue: AttributeValue = {
    id: 5,
    title: 'Color',
    value: 'Blue',
    attributeId: 4,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<VariantAttribute>>;

    repository = {
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<VariantAttribute>>;

    variantsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<VariantsService>;
    attributesValuesService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<AttributesValuesService>;

    service = new VariantAttributesService(
      repository,
      variantsService,
      attributesValuesService,
    );
  });

  describe('create', () => {
    it('should validate related records and create the association', async () => {
      const variantAttribute = createVariantAttribute();
      variantsService.findOne.mockResolvedValue(variant);
      attributesValuesService.findOne.mockResolvedValue(attributeValue);
      repository.exists.mockResolvedValue(false);
      repository.create.mockReturnValue(variantAttribute);
      repository.save.mockResolvedValue(variantAttribute);

      await expect(service.create(variantAttributeDto)).resolves.toEqual(
        variantAttribute,
      );
      expect(variantsService.findOne).toHaveBeenCalledWith(
        variantAttributeDto.variantId,
      );
      expect(attributesValuesService.findOne).toHaveBeenCalledWith(
        variantAttributeDto.attributeValueId,
      );
      expect(repository.exists).toHaveBeenCalledWith({
        where: variantAttributeDto,
      });
      expect(repository.create).toHaveBeenCalledWith(variantAttributeDto);
      expect(repository.save).toHaveBeenCalledWith(variantAttribute);
    });

    it('should reject a duplicate association', async () => {
      variantsService.findOne.mockResolvedValue(variant);
      attributesValuesService.findOne.mockResolvedValue(attributeValue);
      repository.exists.mockResolvedValue(true);

      await expect(service.create(variantAttributeDto)).rejects.toThrow(
        new ConflictException(
          'Esta associação entre variante e valor de atributo já existe',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const association = createVariantAttribute();
      const filters: QueryVariantAttributeDto = {
        variantId: 3,
        attributeValueId: 5,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[association], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [association],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'variantAttribute',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'variantAttribute.attributeValue',
        'attributeValue',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'attributeValue.attribute',
        'attribute',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'variantAttribute.variantId = :variantId',
        { variantId: 3 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'variantAttribute.attributeValueId = :attributeValueId',
        { attributeValueId: 5 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.query(new QueryVariantAttributeDto()),
      ).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an association and load its relations', async () => {
      const association = createVariantAttribute();
      repository.findOne.mockResolvedValue(association);

      await expect(service.findOne(association.id)).resolves.toEqual(
        association,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: association.id },
        relations: { variant: true, attributeValue: { attribute: true } },
      });
    });

    it('should throw not found when the association does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Atributo de variante de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed relations and update the association', async () => {
      const existing = createVariantAttribute();
      const updateDto = { variantId: 8, attributeValueId: 9 };
      const updated = { ...existing, ...updateDto };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      variantsService.findOne.mockResolvedValue({ ...variant, id: 8 });
      attributesValuesService.findOne.mockResolvedValue({
        ...attributeValue,
        id: 9,
      });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(variantsService.findOne).toHaveBeenCalledWith(8);
      expect(attributesValuesService.findOne).toHaveBeenCalledWith(9);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { variantId: 8, attributeValueId: 9 },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update that duplicates another association', async () => {
      const existing = createVariantAttribute();
      const duplicate = { ...existing, id: 2 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);

      await expect(
        service.update(existing.id, { attributeValueId: 9 }),
      ).rejects.toThrow(
        new ConflictException(
          'Esta associação entre variante e valor de atributo já existe',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the association and return a success message', async () => {
      const association = createVariantAttribute();
      repository.findOne.mockResolvedValue(association);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(association.id)).resolves.toBe(
        'Atributo da variante removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(association.id);
    });

    it('should throw not found when the association does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Atributo de variante de id #99 não foi encontrado',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the association is not deleted', async () => {
      const association = createVariantAttribute();
      repository.findOne.mockResolvedValue(association);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(association.id)).rejects.toThrow(
        new ConflictException(
          'Não foi possível remover o atributo da variante',
        ),
      );
    });
  });
});
