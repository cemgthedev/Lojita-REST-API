jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Variant } from '@/entities/variant.entity';
import { CreateVariantDto } from '@/modules/variants/dto/create-variant.dto';
import { QueryVariantDto } from '@/modules/variants/dto/query-variant.dto';
import { UpdateVariantDto } from '@/modules/variants/dto/update-variant.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';

type VariantsServiceMock = jest.Mocked<
  Pick<VariantsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('VariantsController', () => {
  let controller: VariantsController;
  let variantsService: VariantsServiceMock;

  const variantDto: CreateVariantDto = {
    price: 99.99,
    stock: 5,
    sku: 'SHIRT-BLUE-M',
    status: STATUS.ACTIVE,
    productId: 2,
  };

  const variant: Variant = {
    id: 3,
    ...variantDto,
    status: STATUS.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    variantsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [{ provide: VariantsService, useValue: variantsService }],
    }).compile();

    controller = moduleRef.get(VariantsController);
  });

  describe('create', () => {
    it('should pass the variant data to the service', async () => {
      variantsService.create.mockResolvedValue(variant);

      await expect(controller.create(variantDto)).resolves.toEqual(variant);
      expect(variantsService.create).toHaveBeenCalledWith(variantDto);
    });

    it('should propagate not found when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      variantsService.create.mockRejectedValue(error);

      await expect(controller.create(variantDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching variants', async () => {
      const query: QueryVariantDto = {
        productId: 2,
        sku: 'SHIRT',
        status: STATUS.ACTIVE,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [variant],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      variantsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(variantsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar variantes');
      variantsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryVariantDto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the variant id to the service and return the variant', async () => {
      variantsService.findOne.mockResolvedValue(variant);

      await expect(controller.findOne(variant.id)).resolves.toEqual(variant);
      expect(variantsService.findOne).toHaveBeenCalledWith(variant.id);
    });

    it('should propagate not found when the variant does not exist', async () => {
      const error = new NotFoundException(
        'Variante de id #99 não foi encontrada',
      );
      variantsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the variant id and update data to the service', async () => {
      const updateDto: UpdateVariantDto = { stock: 12 };
      const updated = { ...variant, ...updateDto };
      variantsService.update.mockResolvedValue(updated);

      await expect(controller.update(variant.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(variantsService.update).toHaveBeenCalledWith(
        variant.id,
        updateDto,
      );
    });

    it('should propagate not found when the variant does not exist', async () => {
      const error = new NotFoundException(
        'Variante de id #99 não foi encontrada',
      );
      variantsService.update.mockRejectedValue(error);

      await expect(controller.update(99, { stock: 12 })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the variant id to the service and return its result', async () => {
      variantsService.remove.mockResolvedValue('Variante removida com sucesso');

      await expect(controller.remove(variant.id)).resolves.toBe(
        'Variante removida com sucesso',
      );
      expect(variantsService.remove).toHaveBeenCalledWith(variant.id);
    });

    it('should propagate not found when the variant does not exist', async () => {
      const error = new NotFoundException(
        'Variante de id #99 não foi encontrada',
      );
      variantsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the variant cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover a variante',
      );
      variantsService.remove.mockRejectedValue(error);

      await expect(controller.remove(variant.id)).rejects.toBe(error);
    });
  });
});
