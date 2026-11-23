jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Category } from '@/entities/category.entity';
import { Coupon } from '@/entities/coupon.entity';
import { CouponCategory } from '@/entities/coupon-category.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { CategoriesService } from '@/modules/categories/categories.service';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCouponCategoryDto } from './dto/create-coupon-category.dto';
import { QueryCouponCategoryDto } from './dto/query-coupon-category.dto';
import { CouponCategoriesService } from './coupon-categories.service';

describe('CouponCategoriesService', () => {
  let service: CouponCategoriesService;
  let repository: jest.Mocked<Repository<CouponCategory>>;
  let couponsService: jest.Mocked<Pick<CouponsService, 'findOne'>>;
  let categoriesService: jest.Mocked<Pick<CategoriesService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<CouponCategory>>;

  const coupon: Coupon = {
    id: 4,
    title: 'Desconto de verão',
    code: 'VERAO20',
    scopeType: COUPON_SCOPE_TYPE.PLATFORM,
    type: COUPON_TYPE.PERCENTAGE,
    value: '20',
    minPurchaseAmount: '0',
    status: STATUS.ACTIVE,
    startAt: new Date('2026-01-01'),
    endAt: new Date('2027-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const category: Category = {
    id: 6,
    title: 'Roupas',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const associationDto: CreateCouponCategoryDto = {
    couponId: coupon.id,
    categoryId: category.id,
  };

  const createAssociation = (): CouponCategory => ({
    ...associationDto,
    coupon,
    category,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<CouponCategory>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CouponCategory>>;

    couponsService = { findOne: jest.fn() };
    categoriesService = { findOne: jest.fn() };
    service = new CouponCategoriesService(
      repository,
      couponsService as unknown as CouponsService,
      categoriesService as unknown as CategoriesService,
    );
  });

  describe('create', () => {
    it('should validate references and create the association', async () => {
      const association = createAssociation();
      couponsService.findOne.mockResolvedValue(coupon);
      categoriesService.findOne.mockResolvedValue(category);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(association);
      repository.save.mockResolvedValue(association);

      await expect(service.create(associationDto)).resolves.toEqual(
        association,
      );
      expect(couponsService.findOne).toHaveBeenCalledWith(coupon.id);
      expect(categoriesService.findOne).toHaveBeenCalledWith(category.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { couponId: coupon.id, categoryId: category.id },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...associationDto,
        coupon,
        category,
      });
      expect(repository.save).toHaveBeenCalledWith(association);
    });

    it('should reject a duplicate coupon-category association', async () => {
      repository.findOne.mockResolvedValue(createAssociation());

      await expect(service.create(associationDto)).rejects.toThrow(
        new ConflictException('Esta categoria já está associada a este cupom'),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join both relations, apply filters, and paginate results', async () => {
      const association = createAssociation();
      const filters: QueryCouponCategoryDto = {
        couponId: coupon.id,
        categoryId: category.id,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[association], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [association],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'couponCategory.coupon',
        'coupon',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'couponCategory.category',
        'category',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'couponCategory.couponId = :couponId',
        { couponId: coupon.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'couponCategory.categoryId = :categoryId',
        { categoryId: category.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });
  });

  describe('findOne', () => {
    it('should find the association and load its relations', async () => {
      const association = createAssociation();
      repository.findOne.mockResolvedValue(association);

      await expect(service.findOne(coupon.id, category.id)).resolves.toEqual(
        association,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { couponId: coupon.id, categoryId: category.id },
        relations: { coupon: true, category: true },
      });
    });

    it('should throw not found when the association does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99, 99)).rejects.toThrow(
        new NotFoundException(
          'Associação entre cupom e categoria não foi encontrada',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the association keys', async () => {
      const existing = createAssociation();
      const nextCategory = { ...category, id: 7 };
      const updated = {
        ...existing,
        categoryId: nextCategory.id,
        category: nextCategory,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updated);
      categoriesService.findOne.mockResolvedValue(nextCategory);
      repository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      await expect(
        service.update(coupon.id, category.id, {
          categoryId: nextCategory.id,
        }),
      ).resolves.toEqual(updated);
      expect(categoriesService.findOne).toHaveBeenCalledWith(nextCategory.id);
      expect(repository.update).toHaveBeenCalledWith(
        { couponId: coupon.id, categoryId: category.id },
        { couponId: coupon.id, categoryId: nextCategory.id },
      );
    });

    it('should reject an update that collides with another association', async () => {
      const existing = createAssociation();
      const duplicate = { ...existing, categoryId: 7 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);

      await expect(
        service.update(coupon.id, category.id, { categoryId: 7 }),
      ).rejects.toThrow(
        new ConflictException('Esta categoria já está associada a este cupom'),
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the association update affects no rows', async () => {
      repository.findOne
        .mockResolvedValueOnce(createAssociation())
        .mockResolvedValueOnce(null);
      repository.update.mockResolvedValue({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      await expect(service.update(coupon.id, category.id, {})).rejects.toThrow(
        new ConflictException(
          'Não foi possível atualizar a associação entre cupom e categoria',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete the association and return a success message', async () => {
      repository.findOne.mockResolvedValue(createAssociation());
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(coupon.id, category.id)).resolves.toBe(
        'Associação entre cupom e categoria removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith({
        couponId: coupon.id,
        categoryId: category.id,
      });
    });
  });
});
