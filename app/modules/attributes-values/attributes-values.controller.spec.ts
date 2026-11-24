jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { AttributeValue } from '@/entities/attribute-value.entity';
import { CreateAttributesValueDto } from '@/modules/attributes-values/dto/create-attributes-value.dto';
import { QueryAttributesValueDto } from '@/modules/attributes-values/dto/query-attributes-value.dto';
import { UpdateAttributesValueDto } from '@/modules/attributes-values/dto/update-attributes-value.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttributesValuesController } from './attributes-values.controller';
import { AttributesValuesService } from './attributes-values.service';

type AttributesValuesServiceMock = jest.Mocked<
  Pick<
    AttributesValuesService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('AttributesValuesController', () => {
  let controller: AttributesValuesController;
  let attributesValuesService: AttributesValuesServiceMock;

  const valueDto: CreateAttributesValueDto = {
    title: 'Azul',
    value: 'blue',
    attributeId: 2,
  };

  const attributeValue: AttributeValue = {
    id: 3,
    ...valueDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    attributesValuesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AttributesValuesController],
      providers: [
        { provide: AttributesValuesService, useValue: attributesValuesService },
      ],
    }).compile();

    controller = moduleRef.get(AttributesValuesController);
  });

  it('should pass value data to the service on create', async () => {
    attributesValuesService.create.mockResolvedValue(attributeValue);

    await expect(controller.create(valueDto)).resolves.toEqual(attributeValue);
    expect(attributesValuesService.create).toHaveBeenCalledWith(valueDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryAttributesValueDto = {
      attributeId: 2,
      title: 'Az',
      limit: 10,
      page: 1,
    };
    const result = {
      data: [attributeValue],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    attributesValuesService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(attributesValuesService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Valor de atributo de id #99 não foi encontrado',
    );
    attributesValuesService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(attributesValuesService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateAttributesValueDto = { title: 'Azul escuro' };
    const updated = { ...attributeValue, ...updateDto };
    attributesValuesService.update.mockResolvedValue(updated);

    await expect(
      controller.update(attributeValue.id, updateDto),
    ).resolves.toEqual(updated);
    expect(attributesValuesService.update).toHaveBeenCalledWith(
      attributeValue.id,
      updateDto,
    );
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover o valor do atributo',
    );
    attributesValuesService.remove.mockRejectedValue(error);

    await expect(controller.remove(attributeValue.id)).rejects.toBe(error);
    expect(attributesValuesService.remove).toHaveBeenCalledWith(
      attributeValue.id,
    );
  });
});
