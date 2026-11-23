jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Product } from '@/entities/product.entity';
import { Specification } from '@/entities/specification.entity';
import { CreateSpecificationDto } from '@/modules/specifications/dto/create-specification.dto';
import { QuerySpecificationDto } from '@/modules/specifications/dto/query-specification.dto';
import { ProductsService } from '@/modules/products/products.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { SpecificationsService } from './specifications.service';

describe('SpecificationsService', () => {
  let service: SpecificationsService;
  let repository: jest.Mocked<Repository<Specification>>;
  let productsService: jest.Mocked<ProductsService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Specification>>;

  const specificationDto: CreateSpecificationDto = {
    name: 'Color',
    value: 'Blue',
    productId: 2,
  };

  const product: Product = {
    id: 2,
    title: 'T-shirt',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createSpecification = (): Specification => ({
    id: 1,
    ...specificationDto,
    product,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Specification>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Specification>>;

    productsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;

    service = new SpecificationsService(repository, productsService);
  });

  describe('create', () => {
    it('should validate the product and create the specification', async () => {
      const specification = createSpecification();
      productsService.findOne.mockResolvedValue(product);
      repository.create.mockReturnValue(specification);
      repository.save.mockResolvedValue(specification);

      await expect(service.create(specificationDto)).resolves.toEqual(
        specification,
      );
      expect(productsService.findOne).toHaveBeenCalledWith(
        specificationDto.productId,
      );
      expect(repository.create).toHaveBeenCalledWith({
        ...specificationDto,
        product,
      });
      expect(repository.save).toHaveBeenCalledWith(specification);
    });

    it('should not create the specification when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #2 não foi encontrado',
      );
      productsService.findOne.mockRejectedValue(error);

      await expect(service.create(specificationDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should apply filters and return pagination metadata', async () => {
      const specification = createSpecification();
      const filters: QuerySpecificationDto = {
        name: 'Col',
        value: 'Blu',
        productId: 2,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[specification], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [specification],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'specification',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'specification.name ILIKE :name',
        { name: '%Col%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'specification.value ILIKE :value',
        { value: '%Blu%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'specification.productId = :productId',
        { productId: 2 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QuerySpecificationDto())).resolves.toEqual(
        {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a specification and load its product', async () => {
      const specification = createSpecification();
      repository.findOne.mockResolvedValue(specification);

      await expect(service.findOne(specification.id)).resolves.toEqual(
        specification,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: specification.id },
        relations: { product: true },
      });
    });

    it('should throw not found when the specification does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Especificação de id #99 não foi encontrada'),
      );
    });
  });

  describe('update', () => {
    it('should update specification data without changing the product', async () => {
      const existing = createSpecification();
      const updateDto = { value: 'Navy blue' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productsService.findOne).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should validate and assign a changed product', async () => {
      const existing = createSpecification();
      const newProduct = { ...product, id: 3 };
      const updateDto = { productId: 3, name: 'Material' };
      const updated = {
        ...existing,
        ...updateDto,
        product: newProduct,
      };
      repository.findOne.mockResolvedValue(existing);
      productsService.findOne.mockResolvedValue(newProduct);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productsService.findOne).toHaveBeenCalledWith(3);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the specification does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { value: 'Navy blue' })).rejects.toThrow(
        new NotFoundException('Especificação de id #99 não foi encontrada'),
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(productsService.findOne).not.toHaveBeenCalled();
    });

    it('should not save when the new product does not exist', async () => {
      const existing = createSpecification();
      const error = new NotFoundException(
        'Produto de id #3 não foi encontrado',
      );
      repository.findOne.mockResolvedValue(existing);
      productsService.findOne.mockRejectedValue(error);

      await expect(service.update(existing.id, { productId: 3 })).rejects.toBe(
        error,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the specification and return a success message', async () => {
      const specification = createSpecification();
      repository.findOne.mockResolvedValue(specification);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(specification.id)).resolves.toBe(
        'Especificação removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(specification.id);
    });

    it('should throw not found when the specification does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Especificação de id #99 não foi encontrada'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the specification is not deleted', async () => {
      const specification = createSpecification();
      repository.findOne.mockResolvedValue(specification);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(specification.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a especificação'),
      );
    });
  });
});
