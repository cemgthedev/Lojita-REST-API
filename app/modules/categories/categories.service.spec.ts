jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Category } from '@/entities/category.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<Repository<Category>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Category>>;

  const categoryDto: CreateCategoryDto = {
    title: 'Roupas',
    imageUrl: 'https://example.com/category.png',
    description: 'Roupas e acessórios',
  };

  const createCategory = (): Category => ({
    id: 6,
    ...categoryDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Category>>;

    repository = {
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Category>>;

    service = new CategoriesService(repository);
  });

  describe('create', () => {
    it('should create and save a category when its title is available', async () => {
      const category = createCategory();
      repository.exists.mockResolvedValue(false);
      repository.create.mockReturnValue(category);
      repository.save.mockResolvedValue(category);

      await expect(service.create(categoryDto)).resolves.toEqual(category);
      expect(repository.exists).toHaveBeenCalledWith({
        where: { title: categoryDto.title },
      });
      expect(repository.create).toHaveBeenCalledWith(categoryDto);
      expect(repository.save).toHaveBeenCalledWith(category);
    });

    it('should reject a title that is already registered', async () => {
      repository.exists.mockResolvedValue(true);

      await expect(service.create(categoryDto)).rejects.toThrow(
        new ConflictException(
          `A categoria '${categoryDto.title}' já foi cadastrada`,
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should filter by title and return pagination metadata', async () => {
      const category = createCategory();
      const filters: QueryCategoryDto = {
        title: 'roup',
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[category], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [category],
        meta: { total: 35, limit: 20, page: 2, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('category');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.title ILIKE :title',
        { title: '%roup%' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without an optional title using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCategoryDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, limit: 10, page: 1, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a category by id', async () => {
      const category = createCategory();
      repository.findOne.mockResolvedValue(category);

      await expect(service.findOne(category.id)).resolves.toEqual(category);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: category.id },
      });
    });

    it('should throw not found when the category does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Categoria de id #99 não foi encontrada'),
      );
    });
  });

  describe('update', () => {
    it('should update the category and save it', async () => {
      const existing = createCategory();
      const updateDto = { title: 'Moda' };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the category does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { title: 'Moda' })).rejects.toThrow(
        new NotFoundException('Categoria de id #99 não foi encontrada'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the category and return a success message', async () => {
      const category = createCategory();
      repository.findOne.mockResolvedValue(category);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(category.id)).resolves.toBe(
        'Categoria removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(category.id);
    });

    it('should throw a conflict when the category is not deleted', async () => {
      const category = createCategory();
      repository.findOne.mockResolvedValue(category);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(category.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a categoria'),
      );
    });
  });
});
