jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Product } from '@/entities/product.entity';
import { Variant } from '@/entities/variant.entity';
import { CreateVariantDto } from '@/modules/variants/dto/create-variant.dto';
import { QueryVariantDto } from '@/modules/variants/dto/query-variant.dto';
import { ProductsService } from '@/modules/products/products.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { VariantsService } from './variants.service';

describe('VariantsService', () => {
  let service: VariantsService;
  let repository: jest.Mocked<Repository<Variant>>;
  let productsService: jest.Mocked<ProductsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Variant>>;

  const variantDto: CreateVariantDto = {
    price: 99.99,
    stock: 5,
    sku: 'SHIRT-BLUE-M',
    status: STATUS.ACTIVE,
    productId: 2,
  };

  const createVariant = (): Variant => ({
    id: 3,
    ...variantDto,
    status: STATUS.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const product: Product = {
    id: 2,
    title: 'T-shirt',
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
    } as unknown as jest.Mocked<SelectQueryBuilder<Variant>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Variant>>;

    productsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;

    service = new VariantsService(repository, productsService);
  });

  describe('create', () => {
    it('should validate the product and create the variant', async () => {
      const variant = createVariant();
      productsService.findOne.mockResolvedValue(product);
      repository.create.mockReturnValue(variant);
      repository.save.mockResolvedValue(variant);

      await expect(service.create(variantDto)).resolves.toEqual(variant);
      expect(productsService.findOne).toHaveBeenCalledWith(
        variantDto.productId,
      );
      expect(repository.create).toHaveBeenCalledWith(variantDto);
      expect(repository.save).toHaveBeenCalledWith(variant);
    });

    it('should not create the variant when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      productsService.findOne.mockRejectedValue(error);

      await expect(service.create(variantDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join the product, apply filters, and return pagination metadata', async () => {
      const variant = createVariant();
      const filters: QueryVariantDto = {
        productId: 2,
        sku: 'SHIRT',
        status: STATUS.ACTIVE,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[variant], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [variant],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('variant');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'variant.product',
        'product',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'variant.productId = :productId',
        { productId: 2 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'variant.sku ILIKE :sku',
        { sku: '%SHIRT%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'variant.status = :status',
        { status: STATUS.ACTIVE },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryVariantDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a variant and load its product', async () => {
      const variant = createVariant();
      repository.findOne.mockResolvedValue(variant);

      await expect(service.findOne(variant.id)).resolves.toEqual(variant);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: variant.id },
        relations: { product: true },
      });
    });

    it('should throw not found when the variant does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Variante de id #99 não foi encontrada'),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed product and update the variant', async () => {
      const existing = createVariant();
      const updateDto = { productId: 8, stock: 12 };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      productsService.findOne.mockResolvedValue({ ...product, id: 8 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productsService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the variant does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { stock: 12 })).rejects.toThrow(
        new NotFoundException('Variante de id #99 não foi encontrada'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the variant and return a success message', async () => {
      const variant = createVariant();
      repository.findOne.mockResolvedValue(variant);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(variant.id)).resolves.toBe(
        'Variante removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(variant.id);
    });

    it('should throw not found when the variant does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Variante de id #99 não foi encontrada'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the variant is not deleted', async () => {
      const variant = createVariant();
      repository.findOne.mockResolvedValue(variant);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(variant.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a variante'),
      );
    });
  });
});
