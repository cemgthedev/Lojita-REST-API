jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { VariantImage } from '@/entities/variant-image.entity';
import { CreateVariantImageDto } from '@/modules/variant-images/dto/create-variant-image.dto';
import { QueryVariantImageDto } from '@/modules/variant-images/dto/query-variant-image.dto';
import { UpdateVariantImageDto } from '@/modules/variant-images/dto/update-variant-image.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VariantImagesController } from './variant-images.controller';
import { VariantImagesService } from './variant-images.service';

type VariantImagesServiceMock = jest.Mocked<
  Pick<
    VariantImagesService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('VariantImagesController', () => {
  let controller: VariantImagesController;
  let variantImagesService: VariantImagesServiceMock;

  const variantImageDto: CreateVariantImageDto = {
    url: 'https://example.com/image.jpg',
    sortOrder: 1,
    variantId: 3,
  };

  const variantImage: VariantImage = {
    id: 1,
    ...variantImageDto,
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    variantImagesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VariantImagesController],
      providers: [
        { provide: VariantImagesService, useValue: variantImagesService },
      ],
    }).compile();

    controller = moduleRef.get(VariantImagesController);
  });

  describe('create', () => {
    it('should pass the image data to the service', async () => {
      variantImagesService.create.mockResolvedValue(variantImage);

      await expect(controller.create(variantImageDto)).resolves.toEqual(
        variantImage,
      );
      expect(variantImagesService.create).toHaveBeenCalledWith(variantImageDto);
    });

    it('should propagate not found when the variant does not exist', async () => {
      const error = new NotFoundException(
        'Variante de id #3 não foi encontrada',
      );
      variantImagesService.create.mockRejectedValue(error);

      await expect(controller.create(variantImageDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching images', async () => {
      const query: QueryVariantImageDto = {
        variantId: 3,
        url: 'image',
        limit: 10,
        page: 1,
      };
      const result = {
        data: [variantImage],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      variantImagesService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(variantImagesService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar imagens de variantes');
      variantImagesService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryVariantImageDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the image id to the service and return the image', async () => {
      variantImagesService.findOne.mockResolvedValue(variantImage);

      await expect(controller.findOne(variantImage.id)).resolves.toEqual(
        variantImage,
      );
      expect(variantImagesService.findOne).toHaveBeenCalledWith(
        variantImage.id,
      );
    });

    it('should propagate not found when the image does not exist', async () => {
      const error = new NotFoundException(
        'Imagem da variante de id #99 não foi encontrada',
      );
      variantImagesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the image id and update data to the service', async () => {
      const updateDto: UpdateVariantImageDto = { sortOrder: 2 };
      const updated = { ...variantImage, ...updateDto };
      variantImagesService.update.mockResolvedValue(updated);

      await expect(
        controller.update(variantImage.id, updateDto),
      ).resolves.toEqual(updated);
      expect(variantImagesService.update).toHaveBeenCalledWith(
        variantImage.id,
        updateDto,
      );
    });

    it('should propagate not found when the image does not exist', async () => {
      const error = new NotFoundException(
        'Imagem da variante de id #99 não foi encontrada',
      );
      variantImagesService.update.mockRejectedValue(error);

      await expect(controller.update(99, { sortOrder: 2 })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the image id to the service and return its result', async () => {
      variantImagesService.remove.mockResolvedValue(
        'Imagem da variante removida com sucesso',
      );

      await expect(controller.remove(variantImage.id)).resolves.toBe(
        'Imagem da variante removida com sucesso',
      );
      expect(variantImagesService.remove).toHaveBeenCalledWith(variantImage.id);
    });

    it('should propagate not found when the image does not exist', async () => {
      const error = new NotFoundException(
        'Imagem da variante de id #99 não foi encontrada',
      );
      variantImagesService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the image cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover a imagem da variante',
      );
      variantImagesService.remove.mockRejectedValue(error);

      await expect(controller.remove(variantImage.id)).rejects.toBe(error);
    });
  });
});
