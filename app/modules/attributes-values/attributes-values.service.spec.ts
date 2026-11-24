jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Attribute } from '@/entities/attribute.entity';
import { AttributeValue } from '@/entities/attribute-value.entity';
import { ATRIBUTE_TYPE } from '@/modules/attributes/enums/type.enum';
import { AttributesService } from '@/modules/attributes/attribute.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateAttributesValueDto } from './dto/create-attributes-value.dto';
import { QueryAttributesValueDto } from './dto/query-attributes-value.dto';
import { AttributesValuesService } from './attributes-values.service';

describe('AttributesValuesService', () => {
  let service: AttributesValuesService;
  let repository: jest.Mocked<Repository<AttributeValue>>;
  let attributesService: jest.Mocked<Pick<AttributesService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<AttributeValue>>;

  const attribute: Attribute = {
    id: 2,
    name: 'Color',
    type: ATRIBUTE_TYPE.WORD,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const valueDto: CreateAttributesValueDto = {
    title: 'Azul',
    value: 'blue',
    attributeId: attribute.id,
  };

  const createValue = (): AttributeValue => ({
    id: 3,
    ...valueDto,
    attribute,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<AttributeValue>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<AttributeValue>>;

    attributesService = { findOne: jest.fn() };
    service = new AttributesValuesService(
      repository,
      attributesService as unknown as AttributesService,
    );
  });

  describe('create', () => {
    it('should validate the attribute and create its value', async () => {
      const value = createValue();
      attributesService.findOne.mockResolvedValue(attribute);
      repository.create.mockReturnValue(value);
      repository.save.mockResolvedValue(value);

      await expect(service.create(valueDto)).resolves.toEqual(value);
      expect(attributesService.findOne).toHaveBeenCalledWith(
        valueDto.attributeId,
      );
      expect(repository.create).toHaveBeenCalledWith({
        ...valueDto,
        attribute,
      });
      expect(repository.save).toHaveBeenCalledWith(value);
    });

    it('should not create a value when the attribute does not exist', async () => {
      const error = new NotFoundException(
        'Atributo de id #2 não foi encontrado',
      );
      attributesService.findOne.mockRejectedValue(error);

      await expect(service.create(valueDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join the attribute, apply filters, and paginate results', async () => {
      const value = createValue();
      const filters: QueryAttributesValueDto = {
        attributeId: attribute.id,
        title: 'Az',
        value: 'bl',
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[value], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [value],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'attributesValue',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'attributesValue.attribute',
        'attribute',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'attributesValue.attributeId = :attributeId',
        { attributeId: attribute.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'attributesValue.title ILIKE :title',
        { title: '%Az%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'attributesValue.value ILIKE :value',
        { value: '%bl%' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.query(new QueryAttributesValueDto()),
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
    it('should find a value and load its attribute', async () => {
      const value = createValue();
      repository.findOne.mockResolvedValue(value);

      await expect(service.findOne(value.id)).resolves.toEqual(value);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: value.id },
        relations: { attribute: true },
      });
    });

    it('should throw not found when the value does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Valor de atributo de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed attribute and update the value', async () => {
      const existing = createValue();
      const nextAttribute = { ...attribute, id: 4 };
      const updateDto = {
        title: 'Vermelho',
        value: 'red',
        attributeId: nextAttribute.id,
      };
      const updated = {
        ...existing,
        ...updateDto,
        attribute: nextAttribute,
      };
      repository.findOne.mockResolvedValue(existing);
      attributesService.findOne.mockResolvedValue(nextAttribute);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(attributesService.findOne).toHaveBeenCalledWith(nextAttribute.id);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not look up an attribute when its id is unchanged', async () => {
      const existing = createValue();
      const updated = { ...existing, title: 'Azul escuro' };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(
        service.update(existing.id, { title: 'Azul escuro' }),
      ).resolves.toEqual(updated);
      expect(attributesService.findOne).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the value does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { title: 'Vermelho' })).rejects.toThrow(
        new NotFoundException('Valor de atributo de id #99 não foi encontrado'),
      );
      expect(attributesService.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the value and return a success message', async () => {
      const value = createValue();
      repository.findOne.mockResolvedValue(value);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(value.id)).resolves.toBe(
        'Valor do atributo removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(value.id);
    });

    it('should throw a conflict when the value is not deleted', async () => {
      const value = createValue();
      repository.findOne.mockResolvedValue(value);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(value.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o valor do atributo'),
      );
    });
  });
});
