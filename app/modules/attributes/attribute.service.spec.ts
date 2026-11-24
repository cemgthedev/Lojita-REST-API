jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Attribute } from '@/entities/attribute.entity';
import { ATRIBUTE_TYPE } from '@/modules/attributes/enums/type.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { QueryAttributeDto } from './dto/query-attribute.dto';
import { AttributesService } from './attribute.service';

describe('AttributeService', () => {
  let service: AttributesService;
  let repository: jest.Mocked<Repository<Attribute>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Attribute>>;

  const attributeDto: CreateAttributeDto = {
    name: 'Color',
    type: ATRIBUTE_TYPE.WORD,
  };

  const createAttribute = (): Attribute => ({
    id: 2,
    ...attributeDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Attribute>>;

    repository = {
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Attribute>>;

    service = new AttributesService(repository);
  });

  describe('create', () => {
    it('should create and save an attribute when its name is available', async () => {
      const attribute = createAttribute();
      repository.exists.mockResolvedValue(false);
      repository.create.mockReturnValue(attribute);
      repository.save.mockResolvedValue(attribute);

      await expect(service.create(attributeDto)).resolves.toEqual(attribute);
      expect(repository.exists).toHaveBeenCalledWith({
        where: { name: attributeDto.name },
      });
      expect(repository.create).toHaveBeenCalledWith(attributeDto);
      expect(repository.save).toHaveBeenCalledWith(attribute);
    });

    it('should reject a name that already exists', async () => {
      repository.exists.mockResolvedValue(true);

      await expect(service.create(attributeDto)).rejects.toThrow(
        new ConflictException(
          `Atributo com nome '${attributeDto.name}' já existe`,
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join attribute values and return pagination metadata', async () => {
      const attribute = createAttribute();
      const query: QueryAttributeDto = { limit: 20, page: 2 };
      queryBuilder.getManyAndCount.mockResolvedValue([[attribute], 35]);

      await expect(service.query(query)).resolves.toEqual({
        data: [attribute],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('attribute');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'attribute.values',
        'values',
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query with default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryAttributeDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an attribute by id', async () => {
      const attribute = createAttribute();
      repository.findOne.mockResolvedValue(attribute);

      await expect(service.findOne(attribute.id)).resolves.toEqual(attribute);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: attribute.id },
      });
    });

    it('should throw not found when the attribute does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Atributo de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should update the attribute when the new name is available', async () => {
      const existing = createAttribute();
      const updateDto = { name: 'Tamanho' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.exists.mockResolvedValue(false);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(repository.exists).toHaveBeenCalledWith({
        where: { name: updateDto.name },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update when the new name already exists', async () => {
      const existing = createAttribute();
      repository.findOne.mockResolvedValue(existing);
      repository.exists.mockResolvedValue(true);

      await expect(
        service.update(existing.id, { name: 'Tamanho' }),
      ).rejects.toThrow(
        new ConflictException("Atributo com nome 'Tamanho' já existe"),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the attribute does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Tamanho' })).rejects.toThrow(
        new NotFoundException('Atributo de id #99 não foi encontrado'),
      );
      expect(repository.exists).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the attribute and return a success message', async () => {
      const attribute = createAttribute();
      repository.findOne.mockResolvedValue(attribute);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(attribute.id)).resolves.toBe(
        'Atributo foi removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(attribute.id);
    });

    it('should throw a conflict when the attribute is not deleted', async () => {
      const attribute = createAttribute();
      repository.findOne.mockResolvedValue(attribute);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(attribute.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o atributo'),
      );
    });
  });
});
