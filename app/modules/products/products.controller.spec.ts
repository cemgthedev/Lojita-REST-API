jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
  OmitType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Product } from '@/entities/product.entity';
import { CreateProductDto } from '@/modules/products/dto/create-product.dto';
import { QueryProductDto } from '@/modules/products/dto/query-product.dto';
import { UpdateProductDto } from '@/modules/products/dto/update-product.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

type ProductsServiceMock = jest.Mocked<
  Pick<ProductsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: ProductsServiceMock;

  const productDto: CreateProductDto = {
    title: 'T-shirt',
    description: 'Blue cotton shirt',
    categoryId: 4,
    storeId: 7,
  };

  const product: Product = {
    id: 1,
    ...productDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    productsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = moduleRef.get(ProductsController);
  });

  describe('create', () => {
    it('should pass the product data to the service and return the product', async () => {
      productsService.create.mockResolvedValue(product);

      await expect(controller.create(productDto)).resolves.toEqual(product);
      expect(productsService.create).toHaveBeenCalledWith(productDto);
    });

    it('should propagate not found when a related record does not exist', async () => {
      const error = new NotFoundException(
        'Categoria de id #4 não foi encontrada',
      );
      productsService.create.mockRejectedValue(error);

      await expect(controller.create(productDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching products', async () => {
      const query: QueryProductDto = {
        title: 'T-shirt',
        categoryId: 4,
        storeId: 7,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [product],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      productsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(productsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar produtos');
      productsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QueryProductDto)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('should pass the product id to the service and return the product', async () => {
      productsService.findOne.mockResolvedValue(product);

      await expect(controller.findOne(product.id)).resolves.toEqual(product);
      expect(productsService.findOne).toHaveBeenCalledWith(product.id);
    });

    it('should propagate not found when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #99 não foi encontrado',
      );
      productsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the product id and update data to the service', async () => {
      const updateDto: UpdateProductDto = { title: 'New shirt' };
      const updated = { ...product, ...updateDto };
      productsService.update.mockResolvedValue(updated);

      await expect(controller.update(product.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(productsService.update).toHaveBeenCalledWith(
        product.id,
        updateDto,
      );
    });

    it('should propagate not found when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #99 não foi encontrado',
      );
      productsService.update.mockRejectedValue(error);

      await expect(controller.update(99, { title: 'New shirt' })).rejects.toBe(
        error,
      );
    });
  });

  describe('remove', () => {
    it('should pass the product id to the service and return its result', async () => {
      productsService.remove.mockResolvedValue('Produto removido com sucesso');

      await expect(controller.remove(product.id)).resolves.toBe(
        'Produto removido com sucesso',
      );
      expect(productsService.remove).toHaveBeenCalledWith(product.id);
    });

    it('should propagate not found when the product does not exist', async () => {
      const error = new NotFoundException(
        'Produto de id #99 não foi encontrado',
      );
      productsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the product cannot be deleted', async () => {
      const error = new ConflictException('Não foi possível remover o produto');
      productsService.remove.mockRejectedValue(error);

      await expect(controller.remove(product.id)).rejects.toBe(error);
    });
  });
});
