jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Specification } from '@/entities/specification.entity';
import { CreateSpecificationDto } from '@/modules/specifications/dto/create-specification.dto';
import { QuerySpecificationDto } from '@/modules/specifications/dto/query-specification.dto';
import { UpdateSpecificationDto } from '@/modules/specifications/dto/update-specification.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SpecificationsController } from './specifications.controller';
import { SpecificationsService } from './specifications.service';

type SpecificationsServiceMock = jest.Mocked<
  Pick<
    SpecificationsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('SpecificationsController', () => {
  let controller: SpecificationsController;
  let specificationsService: SpecificationsServiceMock;

  const specificationDto: CreateSpecificationDto = {
    name: 'Color',
    value: 'Blue',
    productId: 2,
  };

  const specification: Specification = {
    id: 1,
    ...specificationDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    specificationsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SpecificationsController],
      providers: [
        { provide: SpecificationsService, useValue: specificationsService },
      ],
    }).compile();

    controller = moduleRef.get(SpecificationsController);
  });

  describe('create', () => {
    it('should pass the specification data to the service', async () => {
      specificationsService.create.mockResolvedValue(specification);

      await expect(controller.create(specificationDto)).resolves.toEqual(
        specification,
      );
      expect(specificationsService.create).toHaveBeenCalledWith(
        specificationDto,
      );
    });

    it('should propagate not found when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      specificationsService.create.mockRejectedValue(error);

      await expect(controller.create(specificationDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching specifications', async () => {
      const query: QuerySpecificationDto = {
        name: 'Color',
        productId: 2,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [specification],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      specificationsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(specificationsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar especificações');
      specificationsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QuerySpecificationDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the specification id to the service', async () => {
      specificationsService.findOne.mockResolvedValue(specification);

      await expect(controller.findOne(specification.id)).resolves.toEqual(
        specification,
      );
      expect(specificationsService.findOne).toHaveBeenCalledWith(
        specification.id,
      );
    });

    it('should propagate not found when the specification does not exist', async () => {
      const error = new NotFoundException(
        'Especificação de id #99 não foi encontrada',
      );
      specificationsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the specification id and update data to the service', async () => {
      const updateDto: UpdateSpecificationDto = { value: 'Navy blue' };
      const updated = { ...specification, ...updateDto };
      specificationsService.update.mockResolvedValue(updated);

      await expect(
        controller.update(specification.id, updateDto),
      ).resolves.toEqual(updated);
      expect(specificationsService.update).toHaveBeenCalledWith(
        specification.id,
        updateDto,
      );
    });

    it('should propagate not found when the specification does not exist', async () => {
      const error = new NotFoundException(
        'Especificação de id #99 não foi encontrada',
      );
      specificationsService.update.mockRejectedValue(error);

      await expect(controller.update(99, { value: 'Navy blue' })).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('should pass the specification id to the service and return its result', async () => {
      specificationsService.remove.mockResolvedValue(
        'Especificação removida com sucesso',
      );

      await expect(controller.remove(specification.id)).resolves.toBe(
        'Especificação removida com sucesso',
      );
      expect(specificationsService.remove).toHaveBeenCalledWith(
        specification.id,
      );
    });

    it('should propagate not found when the specification does not exist', async () => {
      const error = new NotFoundException(
        'Especificação de id #99 não foi encontrada',
      );
      specificationsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the specification cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover a especificação',
      );
      specificationsService.remove.mockRejectedValue(error);

      await expect(controller.remove(specification.id)).rejects.toBe(error);
    });
  });
});
