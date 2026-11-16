import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Coupon } from '@/entities/coupon.entity';
import { Store } from '@/entities/store.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { StoresService } from '@/modules/stores/stores.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

export type CouponsResponse = {
  data: Coupon[];
  meta: PaginationResponse;
};

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepository: Repository<Coupon>,
    private readonly storesService: StoresService,
  ) {}

  async create(coupon: CreateCouponDto) {
    const store = await this.validateStore(coupon.storeId);
    this.validateScope(coupon.scopeType, coupon.storeId);
    this.validateDates(coupon.startAt, coupon.endAt);
    this.validateValue(coupon.type, coupon.value);
    await this.ensureCodeIsUnique(coupon.code);

    const newCoupon = this.couponsRepository.create({
      ...this.toCouponEntity(coupon),
      store,
    });

    return this.couponsRepository.save(newCoupon);
  }

  async query(query: QueryCouponDto): Promise<CouponsResponse> {
    const { title, code, scopeType, type, status, storeId, limit, page } =
      query;
    const pageLimit = limit ?? 10;
    const currentPage = page ?? 1;
    const queryBuilder = this.couponsRepository.createQueryBuilder('coupon');

    queryBuilder.leftJoinAndSelect('coupon.store', 'store');

    if (title) {
      queryBuilder.andWhere('coupon.title ILIKE :title', {
        title: `%${title}%`,
      });
    }

    if (code) {
      queryBuilder.andWhere('coupon.code ILIKE :code', { code: `%${code}%` });
    }

    if (scopeType) {
      queryBuilder.andWhere('coupon.scopeType = :scopeType', { scopeType });
    }

    if (type) {
      queryBuilder.andWhere('coupon.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('coupon.status = :status', { status });
    }

    if (storeId !== undefined) {
      queryBuilder.andWhere('coupon.storeId = :storeId', { storeId });
    }

    const [coupons, total] = await queryBuilder
      .take(pageLimit)
      .skip((currentPage - 1) * pageLimit)
      .getManyAndCount();

    return {
      data: coupons,
      meta: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    };
  }

  async findOne(id: number) {
    const coupon = await this.couponsRepository.findOne({
      where: { id },
      relations: { store: true },
    });

    if (!coupon) {
      throw new NotFoundException(`Cupom de id #${id} não foi encontrado`);
    }

    return coupon;
  }

  async update(id: number, coupon: UpdateCouponDto) {
    const couponResponse = await this.findOne(id);
    const store =
      coupon.storeId === undefined
        ? undefined
        : await this.validateStore(coupon.storeId);
    const nextScopeType = coupon.scopeType ?? couponResponse.scopeType;
    const nextStoreId =
      coupon.storeId === undefined ? couponResponse.storeId : coupon.storeId;
    const nextType = coupon.type ?? couponResponse.type;
    const nextValue = coupon.value ?? Number(couponResponse.value);
    const nextStartAt = coupon.startAt ?? couponResponse.startAt;
    const nextEndAt = coupon.endAt ?? couponResponse.endAt;

    this.validateScope(nextScopeType, nextStoreId);
    this.validateDates(nextStartAt, nextEndAt);
    this.validateValue(nextType, nextValue);

    if (coupon.code !== undefined) {
      await this.ensureCodeIsUnique(coupon.code, id);
    }

    Object.assign(couponResponse, this.toCouponEntity(coupon));

    if (coupon.storeId !== undefined) {
      couponResponse.store = store;
    }

    return this.couponsRepository.save(couponResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.couponsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o cupom');
    }

    return 'Cupom removido com sucesso';
  }

  private async validateStore(
    storeId?: number | null,
  ): Promise<Store | undefined> {
    if (storeId === undefined || storeId === null) {
      return undefined;
    }

    return this.storesService.findOne(storeId);
  }

  private validateScope(scopeType: COUPON_SCOPE_TYPE, storeId?: number | null) {
    if (scopeType === COUPON_SCOPE_TYPE.STORE && storeId == null) {
      throw new BadRequestException(
        'Cupons com escopo de loja devem informar uma loja',
      );
    }
  }

  private validateDates(startAt: Date, endAt: Date) {
    if (startAt >= endAt) {
      throw new BadRequestException(
        'A data de início do cupom deve ser anterior à data de término',
      );
    }
  }

  private validateValue(type: COUPON_TYPE, value: number) {
    if (type === COUPON_TYPE.PERCENTAGE && value > 100) {
      throw new BadRequestException(
        'O valor de um cupom percentual não pode exceder 100',
      );
    }
  }

  private async ensureCodeIsUnique(code: string, excludeId?: number) {
    const coupon = await this.couponsRepository.findOne({ where: { code } });

    if (coupon && coupon.id !== excludeId) {
      throw new ConflictException(`O código de cupom '${code}' já foi usado`);
    }
  }

  private toCouponEntity(
    coupon: CreateCouponDto | UpdateCouponDto,
  ): Partial<Coupon> {
    const couponEntity: Partial<Coupon> = {};

    if (coupon.title !== undefined) {
      couponEntity.title = coupon.title;
    }

    if (coupon.code !== undefined) {
      couponEntity.code = coupon.code;
    }

    if (coupon.description !== undefined) {
      couponEntity.description = coupon.description;
    }

    if (coupon.scopeType !== undefined) {
      couponEntity.scopeType = coupon.scopeType;
    }

    if (coupon.type !== undefined) {
      couponEntity.type = coupon.type;
    }

    if (coupon.value !== undefined) {
      couponEntity.value = String(coupon.value);
    }

    if (coupon.minPurchaseAmount !== undefined) {
      couponEntity.minPurchaseAmount = String(coupon.minPurchaseAmount);
    }

    if (coupon.usageLimit !== undefined) {
      couponEntity.usageLimit = coupon.usageLimit;
    }

    if (coupon.usageLimitPerUser !== undefined) {
      couponEntity.usageLimitPerUser = coupon.usageLimitPerUser;
    }

    if (coupon.status !== undefined) {
      couponEntity.status = coupon.status;
    }

    if (coupon.startAt !== undefined) {
      couponEntity.startAt = coupon.startAt;
    }

    if (coupon.endAt !== undefined) {
      couponEntity.endAt = coupon.endAt;
    }

    if (coupon.storeId !== undefined) {
      couponEntity.storeId = coupon.storeId;
    }

    return couponEntity;
  }
}
