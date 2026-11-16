import { PaginationResponse } from '@/common/types/pagination-response.type';
import { CouponCategory } from '@/entities/coupon-category.entity';
import { CategoriesService } from '@/modules/categories/categories.service';
import { CouponsService } from '@/modules/coupons/coupons.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponCategoryDto } from './dto/create-coupon-category.dto';
import { QueryCouponCategoryDto } from './dto/query-coupon-category.dto';
import { UpdateCouponCategoryDto } from './dto/update-coupon-category.dto';

export type CouponCategoriesResponse = {
  data: CouponCategory[];
  meta: PaginationResponse;
};

@Injectable()
export class CouponCategoriesService {
  constructor(
    @InjectRepository(CouponCategory)
    private readonly couponCategoriesRepository: Repository<CouponCategory>,
    private readonly couponsService: CouponsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(couponCategory: CreateCouponCategoryDto) {
    const [coupon, category] = await Promise.all([
      this.couponsService.findOne(couponCategory.couponId),
      this.categoriesService.findOne(couponCategory.categoryId),
    ]);

    await this.ensureAssociationDoesNotExist(
      couponCategory.couponId,
      couponCategory.categoryId,
    );

    const newCouponCategory = this.couponCategoriesRepository.create({
      couponId: coupon.id,
      categoryId: category.id,
      coupon,
      category,
    });

    return this.couponCategoriesRepository.save(newCouponCategory);
  }

  async query(
    query: QueryCouponCategoryDto,
  ): Promise<CouponCategoriesResponse> {
    const { couponId, categoryId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.couponCategoriesRepository.createQueryBuilder('couponCategory');

    queryBuilder
      .leftJoinAndSelect('couponCategory.coupon', 'coupon')
      .leftJoinAndSelect('couponCategory.category', 'category');

    if (couponId !== undefined) {
      queryBuilder.andWhere('couponCategory.couponId = :couponId', {
        couponId,
      });
    }

    if (categoryId !== undefined) {
      queryBuilder.andWhere('couponCategory.categoryId = :categoryId', {
        categoryId,
      });
    }

    const [couponCategories, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: couponCategories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(couponId: number, categoryId: number) {
    const couponCategory = await this.couponCategoriesRepository.findOne({
      where: { couponId, categoryId },
      relations: { coupon: true, category: true },
    });

    if (!couponCategory) {
      throw new NotFoundException(
        'Associação entre cupom e categoria não foi encontrada',
      );
    }

    return couponCategory;
  }

  async update(
    couponId: number,
    categoryId: number,
    couponCategory: UpdateCouponCategoryDto,
  ) {
    await this.findOne(couponId, categoryId);

    const nextCouponId = couponCategory.couponId ?? couponId;
    const nextCategoryId = couponCategory.categoryId ?? categoryId;

    if (couponCategory.couponId !== undefined) {
      await this.couponsService.findOne(nextCouponId);
    }

    if (couponCategory.categoryId !== undefined) {
      await this.categoriesService.findOne(nextCategoryId);
    }

    await this.ensureAssociationDoesNotExist(
      nextCouponId,
      nextCategoryId,
      couponId,
      categoryId,
    );

    const response = await this.couponCategoriesRepository.update(
      { couponId, categoryId },
      { couponId: nextCouponId, categoryId: nextCategoryId },
    );

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível atualizar a associação entre cupom e categoria',
      );
    }

    return this.findOne(nextCouponId, nextCategoryId);
  }

  async remove(couponId: number, categoryId: number) {
    await this.findOne(couponId, categoryId);

    const response = await this.couponCategoriesRepository.delete({
      couponId,
      categoryId,
    });

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover a associação entre cupom e categoria',
      );
    }

    return 'Associação entre cupom e categoria removida com sucesso';
  }

  private async ensureAssociationDoesNotExist(
    couponId: number,
    categoryId: number,
    currentCouponId?: number,
    currentCategoryId?: number,
  ) {
    const couponCategory = await this.couponCategoriesRepository.findOne({
      where: { couponId, categoryId },
    });

    if (
      couponCategory &&
      (couponCategory.couponId !== currentCouponId ||
        couponCategory.categoryId !== currentCategoryId)
    ) {
      throw new ConflictException(
        'Esta categoria já está associada a este cupom',
      );
    }
  }
}
