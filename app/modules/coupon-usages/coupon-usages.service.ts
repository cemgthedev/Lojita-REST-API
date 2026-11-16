import { PaginationResponse } from '@/common/types/pagination-response.type';
import { STATUS } from '@/common/enums/status.enum';
import { Coupon } from '@/entities/coupon.entity';
import { CouponUsage } from '@/entities/coupon-usage.entity';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { OrdersService } from '@/modules/orders/orders.service';
import { UsersService } from '@/modules/users/users.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponUsageDto } from './dto/create-coupon-usage.dto';
import { QueryCouponUsageDto } from './dto/query-coupon-usage.dto';

export type CouponUsagesResponse = {
  data: CouponUsage[];
  meta: PaginationResponse;
};

@Injectable()
export class CouponUsagesService {
  constructor(
    @InjectRepository(CouponUsage)
    private readonly couponUsagesRepository: Repository<CouponUsage>,
    private readonly couponsService: CouponsService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  async create(couponUsage: CreateCouponUsageDto) {
    const [user, coupon, order] = await Promise.all([
      this.usersService.findOne(couponUsage.userId),
      this.couponsService.findOne(couponUsage.couponId),
      this.ordersService.findOne(couponUsage.orderId),
    ]);

    if (order.userId !== user.id) {
      throw new BadRequestException(
        'O pedido informado não pertence ao usuário',
      );
    }

    return this.couponUsagesRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const couponRepository =
          transactionalEntityManager.getRepository(Coupon);
        const couponUsageRepository =
          transactionalEntityManager.getRepository(CouponUsage);
        const lockedCoupon = await couponRepository.findOne({
          where: { id: coupon.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedCoupon) {
          throw new NotFoundException(
            `Cupom de id #${couponUsage.couponId} não foi encontrado`,
          );
        }

        this.ensureCouponCanBeUsed(lockedCoupon);

        const existingUsage = await couponUsageRepository.findOne({
          where: {
            userId: user.id,
            couponId: lockedCoupon.id,
            orderId: order.id,
          },
        });

        if (existingUsage) {
          throw new ConflictException(
            'Este cupom já foi registrado para o pedido informado',
          );
        }

        const totalUsageCount = await couponUsageRepository.count({
          where: { couponId: lockedCoupon.id },
        });

        if (
          lockedCoupon.usageLimit !== null &&
          lockedCoupon.usageLimit !== undefined &&
          totalUsageCount >= lockedCoupon.usageLimit
        ) {
          throw new ConflictException(
            'O limite total de uso do cupom foi atingido',
          );
        }

        const userUsageCount = await couponUsageRepository.count({
          where: { couponId: lockedCoupon.id, userId: user.id },
        });

        if (
          lockedCoupon.usageLimitPerUser !== null &&
          lockedCoupon.usageLimitPerUser !== undefined &&
          userUsageCount >= lockedCoupon.usageLimitPerUser
        ) {
          throw new ConflictException(
            'O usuário atingiu o limite de uso deste cupom',
          );
        }

        const newCouponUsage = couponUsageRepository.create({
          userId: user.id,
          couponId: lockedCoupon.id,
          orderId: order.id,
        });

        return couponUsageRepository.save(newCouponUsage);
      },
    );
  }

  async query(query: QueryCouponUsageDto): Promise<CouponUsagesResponse> {
    const { userId, couponId, orderId, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.couponUsagesRepository.createQueryBuilder('couponUsage');

    if (userId !== undefined) {
      queryBuilder.andWhere('couponUsage.userId = :userId', { userId });
    }

    if (couponId !== undefined) {
      queryBuilder.andWhere('couponUsage.couponId = :couponId', { couponId });
    }

    if (orderId !== undefined) {
      queryBuilder.andWhere('couponUsage.orderId = :orderId', { orderId });
    }

    const [couponUsages, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: couponUsages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: number, couponId: number, orderId: number) {
    const couponUsage = await this.couponUsagesRepository.findOne({
      where: { userId, couponId, orderId },
    });

    if (!couponUsage) {
      throw new NotFoundException(
        'Registro de uso do cupom não foi encontrado',
      );
    }

    return couponUsage;
  }

  async remove(userId: number, couponId: number, orderId: number) {
    await this.findOne(userId, couponId, orderId);

    const response = await this.couponUsagesRepository.delete({
      userId,
      couponId,
      orderId,
    });

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o registro de uso do cupom',
      );
    }

    return 'Registro de uso do cupom removido com sucesso';
  }

  private ensureCouponCanBeUsed(coupon: Coupon) {
    const now = new Date();

    if (coupon.status !== STATUS.ACTIVE) {
      throw new BadRequestException('O cupom não está ativo');
    }

    if (now < coupon.startAt || now > coupon.endAt) {
      throw new BadRequestException(
        'O cupom não está dentro do período de validade',
      );
    }
  }
}
