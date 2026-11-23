jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { STATUS } from '@/common/enums/status.enum';
import { Coupon } from '@/entities/coupon.entity';
import { CouponProduct } from '@/entities/coupon-product.entity';
import { Product } from '@/entities/product.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { ProductsService } from '@/modules/products/products.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCouponProductDto } from './dto/create-coupon-product.dto';
import { QueryCouponProductDto } from './dto/query-coupon-product.dto';
import { CouponProductsService } from './coupon-products.service';

describe('CouponProductsService', () => {
  let service: CouponProductsService;
  let repository: jest.Mocked<Repository<CouponProduct>>;
  let couponsService: jest.Mocked<Pick<CouponsService, 'findOne'>>;
  let productsService: jest.Mocked<Pick<ProductsService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<CouponProduct>>;

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

  const product: Product = {
    id: 8,
    title: 'Camiseta',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const associationDto: CreateCouponProductDto = {
    couponId: coupon.id,
    productId: product.id,
  };

  const createAssociation = (): CouponProduct => ({
    ...associationDto,
    coupon,
    product,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<CouponProduct>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<CouponProduct>>;

    couponsService = { findOne: jest.fn() };
    productsService = { findOne: jest.fn() };
    service = new CouponProductsService(
      repository,
      couponsService as unknown as CouponsService,
      productsService as unknown as ProductsService,
    );
  });

  describe('create', () => {
    it('should validate references and create the association', async () => {
      const association = createAssociation();
      couponsService.findOne.mockResolvedValue(coupon);
      productsService.findOne.mockResolvedValue(product);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(association);
      repository.save.mockResolvedValue(association);

      await expect(service.create(associationDto)).resolves.toEqual(
        association,
      );
      expect(couponsService.findOne).toHaveBeenCalledWith(coupon.id);
      expect(productsService.findOne).toHaveBeenCalledWith(product.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { couponId: coupon.id, productId: product.id },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...associationDto,
        coupon,
        product,
      });
      expect(repository.save).toHaveBeenCalledWith(association);
    });

    it('should reject a duplicate coupon-product association', async () => {
      repository.findOne.mockResolvedValue(createAssociation());

      await expect(service.create(associationDto)).rejects.toThrow(
        new ConflictException('Este produto já está associado a este cupom'),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join both relations, apply filters, and paginate results', async () => {
      const association = createAssociation();
      const filters: QueryCouponProductDto = {
        couponId: coupon.id,
        productId: product.id,
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
        'couponProduct.coupon',
        'coupon',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'couponProduct.product',
        'product',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'couponProduct.couponId = :couponId',
        { couponId: coupon.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'couponProduct.productId = :productId',
        { productId: product.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });
  });

  describe('findOne', () => {
    it('should find the association and load its relations', async () => {
      const association = createAssociation();
      repository.findOne.mockResolvedValue(association);

      await expect(service.findOne(coupon.id, product.id)).resolves.toEqual(
        association,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { couponId: coupon.id, productId: product.id },
        relations: { coupon: true, product: true },
      });
    });

    it('should throw not found when the association does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99, 99)).rejects.toThrow(
        new NotFoundException(
          'Associação entre cupom e produto não foi encontrada',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the association keys', async () => {
      const existing = createAssociation();
      const nextProduct = { ...product, id: 9 };
      const updated = {
        ...existing,
        productId: nextProduct.id,
        product: nextProduct,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updated);
      productsService.findOne.mockResolvedValue(nextProduct);
      repository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      await expect(
        service.update(coupon.id, product.id, { productId: nextProduct.id }),
      ).resolves.toEqual(updated);
      expect(productsService.findOne).toHaveBeenCalledWith(nextProduct.id);
      expect(repository.update).toHaveBeenCalledWith(
        { couponId: coupon.id, productId: product.id },
        { couponId: coupon.id, productId: nextProduct.id },
      );
    });

    it('should reject an update that collides with another association', async () => {
      const existing = createAssociation();
      const duplicate = { ...existing, productId: 9 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);

      await expect(
        service.update(coupon.id, product.id, { productId: 9 }),
      ).rejects.toThrow(
        new ConflictException('Este produto já está associado a este cupom'),
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the association update affects no rows', async () => {
      const existing = createAssociation();
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      repository.update.mockResolvedValue({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      await expect(service.update(coupon.id, product.id, {})).rejects.toThrow(
        new ConflictException(
          'Não foi possível atualizar a associação entre cupom e produto',
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete the association and return a success message', async () => {
      repository.findOne.mockResolvedValue(createAssociation());
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(coupon.id, product.id)).resolves.toBe(
        'Associação entre cupom e produto removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith({
        couponId: coupon.id,
        productId: product.id,
      });
    });
  });
});
