jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Variant } from '@/entities/variant.entity';
import { VariantImage } from '@/entities/variant-image.entity';
import { CreateVariantImageDto } from '@/modules/variant-images/dto/create-variant-image.dto';
import { QueryVariantImageDto } from '@/modules/variant-images/dto/query-variant-image.dto';
import { VariantsService } from '@/modules/variants/variants.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { VariantImagesService } from './variant-images.service';

describe('VariantImagesService', () => {
  let service: VariantImagesService;
  let repository: jest.Mocked<Repository<VariantImage>>;
  let variantsService: jest.Mocked<VariantsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<VariantImage>>;

  const variantImageDto: CreateVariantImageDto = {
    url: 'https://example.com/image.jpg',
    sortOrder: 1,
    variantId: 3,
  };

  const createVariantImage = (): VariantImage => ({
    id: 1,
    ...variantImageDto,
    sortOrder: 1,
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

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<VariantImage>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<VariantImage>>;

    variantsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<VariantsService>;

    service = new VariantImagesService(repository, variantsService);
  });

  describe('create', () => {
    it('should validate the variant and create the image', async () => {
      const variantImage = createVariantImage();
      variantsService.findOne.mockResolvedValue(variant);
      repository.create.mockReturnValue(variantImage);
      repository.save.mockResolvedValue(variantImage);

      await expect(service.create(variantImageDto)).resolves.toEqual(
        variantImage,
      );
      expect(variantsService.findOne).toHaveBeenCalledWith(
        variantImageDto.variantId,
      );
      expect(repository.create).toHaveBeenCalledWith(variantImageDto);
      expect(repository.save).toHaveBeenCalledWith(variantImage);
    });

    it('should not create the image when the variant does not exist', async () => {
      const error = new NotFoundException(
        'Variante de id #3 não foi encontrada',
      );
      variantsService.findOne.mockRejectedValue(error);

      await expect(service.create(variantImageDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const image = createVariantImage();
      const filters: QueryVariantImageDto = {
        variantId: 3,
        url: 'image',
        sortOrder: 1,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[image], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [image],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'variantImage',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'variantImage.variantId = :variantId',
        { variantId: 3 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'variantImage.url ILIKE :url',
        { url: '%image%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'variantImage.sortOrder = :sortOrder',
        { sortOrder: 1 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryVariantImageDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find an image and load its variant', async () => {
      const image = createVariantImage();
      repository.findOne.mockResolvedValue(image);

      await expect(service.findOne(image.id)).resolves.toEqual(image);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: image.id },
        relations: { variant: true },
      });
    });

    it('should throw not found when the image does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Imagem da variante de id #99 não foi encontrada',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed variant and update the image', async () => {
      const existing = createVariantImage();
      const updateDto = {
        url: 'https://example.com/new-image.jpg',
        variantId: 8,
      };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      variantsService.findOne.mockResolvedValue({ ...variant, id: 8 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(variantsService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the image does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { url: 'https://example.com/new-image.jpg' }),
      ).rejects.toThrow(
        new NotFoundException(
          'Imagem da variante de id #99 não foi encontrada',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the image and return a success message', async () => {
      const image = createVariantImage();
      repository.findOne.mockResolvedValue(image);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(image.id)).resolves.toBe(
        'Imagem da variante removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(image.id);
    });

    it('should throw not found when the image does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Imagem da variante de id #99 não foi encontrada',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the image is not deleted', async () => {
      const image = createVariantImage();
      repository.findOne.mockResolvedValue(image);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(image.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a imagem da variante'),
      );
    });
  });
});
