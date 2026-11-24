jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Category } from '@/entities/category.entity';
import { Product } from '@/entities/product.entity';
import { Store } from '@/entities/store.entity';
import { CreateProductDto } from '@/modules/products/dto/create-product.dto';
import { QueryProductDto } from '@/modules/products/dto/query-product.dto';
import { CategoriesService } from '@/modules/categories/categories.service';
import { StoresService } from '@/modules/stores/stores.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let storesService: jest.Mocked<StoresService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Product>>;

  const productDto: CreateProductDto = {
    title: 'T-shirt',
    description: 'Blue cotton shirt',
    categoryId: 4,
    storeId: 7,
  };

  const category: Category = {
    id: 4,
    title: 'Clothing',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const store: Store = {
    id: 7,
    name: 'My Store',
    nickname: 'my-store',
    phoneNumber: '+5511999999999',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createProduct = (): Product => ({
    id: 1,
    ...productDto,
    category,
    store,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Product>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Product>>;

    categoriesService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CategoriesService>;
    storesService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<StoresService>;

    service = new ProductsService(repository, categoriesService, storesService);
  });

  describe('create', () => {
    it('should validate related records and create the product', async () => {
      const product = createProduct();
      categoriesService.findOne.mockResolvedValue(category);
      storesService.findOne.mockResolvedValue(store);
      repository.create.mockReturnValue(product);
      repository.save.mockResolvedValue(product);

      await expect(service.create(productDto)).resolves.toEqual(product);
      expect(categoriesService.findOne).toHaveBeenCalledWith(
        productDto.categoryId,
      );
      expect(storesService.findOne).toHaveBeenCalledWith(productDto.storeId);
      expect(repository.create).toHaveBeenCalledWith({
        ...productDto,
        category,
        store,
      });
      expect(repository.save).toHaveBeenCalledWith(product);
    });

    it('should create without optional category or store references', async () => {
      const dto: CreateProductDto = { title: 'T-shirt' };
      const product: Product = {
        id: 2,
        title: dto.title,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      repository.create.mockReturnValue(product);
      repository.save.mockResolvedValue(product);

      await expect(service.create(dto)).resolves.toEqual(product);
      expect(categoriesService.findOne).not.toHaveBeenCalled();
      expect(storesService.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        category: undefined,
        store: undefined,
      });
    });

    it('should not create the product when a referenced category is missing', async () => {
      const error = new NotFoundException(
        'Categoria de id #4 não foi encontrada',
      );
      categoriesService.findOne.mockRejectedValue(error);

      await expect(service.create(productDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const product = createProduct();
      const filters: QueryProductDto = {
        title: 'T-shirt',
        categoryId: 4,
        storeId: 7,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[product], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [product],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'product.category',
        'category',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'product.store',
        'store',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        3,
        'product.defaultVariant',
        'variant',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'product.title ILIKE :title',
        { title: '%T-shirt%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'product.categoryId = :categoryId',
        { categoryId: 4 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'product.storeId = :storeId',
        { storeId: 7 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryProductDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a product and load its category and store', async () => {
      const product = createProduct();
      repository.findOne.mockResolvedValue(product);

      await expect(service.findOne(product.id)).resolves.toEqual(product);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: product.id },
        relations: { category: true, store: true },
      });
    });

    it('should throw not found when the product does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Produto de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should update the product and replace changed relations', async () => {
      const existing = createProduct();
      const newCategory = { ...category, id: 5 };
      const newStore = { ...store, id: 8 };
      const updateDto = { categoryId: 5, storeId: 8, title: 'New shirt' };
      const updated = {
        ...existing,
        ...updateDto,
        category: newCategory,
        store: newStore,
      };
      repository.findOne.mockResolvedValue(existing);
      categoriesService.findOne.mockResolvedValue(newCategory);
      storesService.findOne.mockResolvedValue(newStore);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(categoriesService.findOne).toHaveBeenCalledWith(5);
      expect(storesService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should update product fields without loading unchanged relations', async () => {
      const existing = createProduct();
      const updateDto = { title: 'New shirt' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(categoriesService.findOne).not.toHaveBeenCalled();
      expect(storesService.findOne).not.toHaveBeenCalled();
    });

    it('should not save when the product does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { title: 'New shirt' })).rejects.toThrow(
        new NotFoundException('Produto de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the product and return a success message', async () => {
      const product = createProduct();
      repository.findOne.mockResolvedValue(product);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(product.id)).resolves.toBe(
        'Produto removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(product.id);
    });

    it('should throw not found when the product does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Produto de id #99 não foi encontrado'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the product is not deleted', async () => {
      const product = createProduct();
      repository.findOne.mockResolvedValue(product);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(product.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o produto'),
      );
    });
  });
});
