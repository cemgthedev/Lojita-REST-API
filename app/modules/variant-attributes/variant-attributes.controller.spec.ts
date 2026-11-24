jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { VariantAttribute } from '@/entities/variant-attribute.entity';
import { CreateVariantAttributeDto } from '@/modules/variant-attributes/dto/create-variant-attribute.dto';
import { QueryVariantAttributeDto } from '@/modules/variant-attributes/dto/query-variant-attribute.dto';
import { UpdateVariantAttributeDto } from '@/modules/variant-attributes/dto/update-variant-attribute.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VariantAttributesController } from './variant-attributes.controller';
import { VariantAttributesService } from './variant-attributes.service';

type VariantAttributesServiceMock = jest.Mocked<
  Pick<
    VariantAttributesService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('VariantAttributesController', () => {
  let controller: VariantAttributesController;
  let variantAttributesService: VariantAttributesServiceMock;

  const variantAttributeDto: CreateVariantAttributeDto = {
    variantId: 3,
    attributeValueId: 5,
  };

  const variantAttribute: VariantAttribute = {
    id: 1,
    ...variantAttributeDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    variantAttributesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VariantAttributesController],
      providers: [
        {
          provide: VariantAttributesService,
          useValue: variantAttributesService,
        },
      ],
    }).compile();

    controller = moduleRef.get(VariantAttributesController);
  });

  describe('create', () => {
    it('should pass the association data to the service', async () => {
      variantAttributesService.create.mockResolvedValue(variantAttribute);

      await expect(controller.create(variantAttributeDto)).resolves.toEqual(
        variantAttribute,
      );
      expect(variantAttributesService.create).toHaveBeenCalledWith(
        variantAttributeDto,
      );
    });

    it('should propagate a conflict for a duplicate association', async () => {
      const error = new ConflictException(
        'Esta associação entre variante e valor de atributo já existe',
      );
      variantAttributesService.create.mockRejectedValue(error);

      await expect(controller.create(variantAttributeDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching associations', async () => {
      const query: QueryVariantAttributeDto = {
        variantId: 3,
        attributeValueId: 5,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [variantAttribute],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      variantAttributesService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(variantAttributesService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar atributos de variantes');
      variantAttributesService.query.mockRejectedValue(error);

      await expect(
        controller.query({} as QueryVariantAttributeDto),
      ).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the association id to the service', async () => {
      variantAttributesService.findOne.mockResolvedValue(variantAttribute);

      await expect(controller.findOne(variantAttribute.id)).resolves.toEqual(
        variantAttribute,
      );
      expect(variantAttributesService.findOne).toHaveBeenCalledWith(
        variantAttribute.id,
      );
    });

    it('should propagate not found when the association does not exist', async () => {
      const error = new NotFoundException(
        'Atributo de variante de id #99 não foi encontrado',
      );
      variantAttributesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the association id and update data to the service', async () => {
      const updateDto: UpdateVariantAttributeDto = { attributeValueId: 9 };
      const updated = { ...variantAttribute, ...updateDto };
      variantAttributesService.update.mockResolvedValue(updated);

      await expect(
        controller.update(variantAttribute.id, updateDto),
      ).resolves.toEqual(updated);
      expect(variantAttributesService.update).toHaveBeenCalledWith(
        variantAttribute.id,
        updateDto,
      );
    });

    it('should propagate not found when the association does not exist', async () => {
      const error = new NotFoundException(
        'Atributo de variante de id #99 não foi encontrado',
      );
      variantAttributesService.update.mockRejectedValue(error);

      await expect(controller.update(99, { variantId: 8 })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the association id to the service and return its result', async () => {
      variantAttributesService.remove.mockResolvedValue(
        'Atributo da variante removido com sucesso',
      );

      await expect(controller.remove(variantAttribute.id)).resolves.toBe(
        'Atributo da variante removido com sucesso',
      );
      expect(variantAttributesService.remove).toHaveBeenCalledWith(
        variantAttribute.id,
      );
    });

    it('should propagate not found when the association does not exist', async () => {
      const error = new NotFoundException(
        'Atributo de variante de id #99 não foi encontrado',
      );
      variantAttributesService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the association cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o atributo da variante',
      );
      variantAttributesService.remove.mockRejectedValue(error);

      await expect(controller.remove(variantAttribute.id)).rejects.toBe(error);
    });
  });
});
