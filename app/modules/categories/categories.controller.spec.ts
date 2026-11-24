jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Category } from '@/entities/category.entity';
import { CreateCategoryDto } from '@/modules/categories/dto/create-category.dto';
import { QueryCategoryDto } from '@/modules/categories/dto/query-category.dto';
import { UpdateCategoryDto } from '@/modules/categories/dto/update-category.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

type CategoriesServiceMock = jest.Mocked<
  Pick<CategoriesService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: CategoriesServiceMock;

  const categoryDto: CreateCategoryDto = {
    title: 'Roupas',
    imageUrl: 'https://example.com/category.png',
    description: 'Roupas e acessórios',
  };

  const category: Category = {
    id: 6,
    ...categoryDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    categoriesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: categoriesService }],
    }).compile();

    controller = moduleRef.get(CategoriesController);
  });

  it('should pass category data to the service on create', async () => {
    categoriesService.create.mockResolvedValue(category);

    await expect(controller.create(categoryDto)).resolves.toEqual(category);
    expect(categoriesService.create).toHaveBeenCalledWith(categoryDto);
  });

  it('should propagate a conflict when the title already exists', async () => {
    const error = new ConflictException(
      `A categoria '${categoryDto.title}' já foi cadastrada`,
    );
    categoriesService.create.mockRejectedValue(error);

    await expect(controller.create(categoryDto)).rejects.toBe(error);
  });

  it('should pass filters to the service on findAll', async () => {
    const query: QueryCategoryDto = {
      title: 'roup',
      limit: 10,
      page: 1,
    };
    const result = {
      data: [category],
      meta: { total: 1, limit: 10, page: 1, totalPages: 1 },
    };
    categoriesService.query.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(categoriesService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Categoria de id #99 não foi encontrada',
    );
    categoriesService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(categoriesService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateCategoryDto = { title: 'Moda' };
    const updated = { ...category, ...updateDto };
    categoriesService.update.mockResolvedValue(updated);

    await expect(controller.update(category.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(categoriesService.update).toHaveBeenCalledWith(
      category.id,
      updateDto,
    );
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException('Não foi possível remover a categoria');
    categoriesService.remove.mockRejectedValue(error);

    await expect(controller.remove(category.id)).rejects.toBe(error);
    expect(categoriesService.remove).toHaveBeenCalledWith(category.id);
  });
});
