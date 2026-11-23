jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Attribute } from '@/entities/attribute.entity';
import { CreateAttributeDto } from '@/modules/attributes/dto/create-attribute.dto';
import { QueryAttributeDto } from '@/modules/attributes/dto/query-attribute.dto';
import { UpdateAttributeDto } from '@/modules/attributes/dto/update-attribute.dto';
import { ATRIBUTE_TYPE } from '@/modules/attributes/enums/type.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttributesController } from './attribute.controller';
import { AttributesService } from './attribute.service';

type AttributesServiceMock = jest.Mocked<
  Pick<AttributesService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('AttributeController', () => {
  let controller: AttributesController;
  let attributesService: AttributesServiceMock;

  const attributeDto: CreateAttributeDto = {
    name: 'Color',
    type: ATRIBUTE_TYPE.WORD,
  };

  const attribute: Attribute = {
    id: 2,
    ...attributeDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    attributesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AttributesController],
      providers: [{ provide: AttributesService, useValue: attributesService }],
    }).compile();

    controller = moduleRef.get(AttributesController);
  });

  it('should pass attribute data to the service on create', async () => {
    attributesService.create.mockResolvedValue(attribute);

    await expect(controller.create(attributeDto)).resolves.toEqual(attribute);
    expect(attributesService.create).toHaveBeenCalledWith(attributeDto);
  });

  it('should propagate a conflict when the name already exists', async () => {
    const error = new ConflictException(
      `Atributo com nome '${attributeDto.name}' já existe`,
    );
    attributesService.create.mockRejectedValue(error);

    await expect(controller.create(attributeDto)).rejects.toBe(error);
  });

  it('should pass filters to the service on findAll', async () => {
    const query: QueryAttributeDto = { limit: 10, page: 1 };
    const result = {
      data: [attribute],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    attributesService.query.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(attributesService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Atributo de id #99 não foi encontrado',
    );
    attributesService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(attributesService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateAttributeDto = { type: ATRIBUTE_TYPE.NUMERIC };
    const updated = { ...attribute, ...updateDto };
    attributesService.update.mockResolvedValue(updated);

    await expect(controller.update(attribute.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(attributesService.update).toHaveBeenCalledWith(
      attribute.id,
      updateDto,
    );
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException('Não foi possível remover o atributo');
    attributesService.remove.mockRejectedValue(error);

    await expect(controller.remove(attribute.id)).rejects.toBe(error);
    expect(attributesService.remove).toHaveBeenCalledWith(attribute.id);
  });
});
