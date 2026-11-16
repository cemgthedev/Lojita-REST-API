import { PaginationResponse } from '@/common/types/pagination-response.type';
import { CouponImage } from '@/entities/coupon-image.entity';
import { CouponsService } from '@/modules/coupons/coupons.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponImageDto } from './dto/create-coupon-image.dto';
import { QueryCouponImageDto } from './dto/query-coupon-image.dto';
import { UpdateCouponImageDto } from './dto/update-coupon-image.dto';

export type CouponImagesResponse = {
  data: CouponImage[];
  meta: PaginationResponse;
};

@Injectable()
export class CouponImagesService {
  constructor(
    @InjectRepository(CouponImage)
    private readonly couponImagesRepository: Repository<CouponImage>,
    private readonly couponsService: CouponsService,
  ) {}

  async create(couponImage: CreateCouponImageDto) {
    const coupon = await this.couponsService.findOne(couponImage.couponId);

    const newCouponImage = this.couponImagesRepository.create({
      ...couponImage,
      coupon,
    });

    return this.couponImagesRepository.save(newCouponImage);
  }

  async query(query: QueryCouponImageDto): Promise<CouponImagesResponse> {
    const { couponId, url, sortOrder, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.couponImagesRepository.createQueryBuilder('couponImage');

    if (couponId !== undefined) {
      queryBuilder.andWhere('couponImage.couponId = :couponId', {
        couponId,
      });
    }

    if (url) {
      queryBuilder.andWhere('couponImage.url ILIKE :url', {
        url: `%${url}%`,
      });
    }

    if (sortOrder !== undefined) {
      queryBuilder.andWhere('couponImage.sortOrder = :sortOrder', {
        sortOrder,
      });
    }

    const [couponImages, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: couponImages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const couponImage = await this.couponImagesRepository.findOne({
      where: { id },
      relations: { coupon: true },
    });

    if (!couponImage) {
      throw new NotFoundException(
        `Imagem do cupom de id #${id} não foi encontrada`,
      );
    }

    return couponImage;
  }

  async update(id: number, couponImage: UpdateCouponImageDto) {
    const couponImageResponse = await this.findOne(id);
    const coupon =
      couponImage.couponId === undefined
        ? undefined
        : await this.couponsService.findOne(couponImage.couponId);

    Object.assign(couponImageResponse, couponImage);

    if (coupon) {
      couponImageResponse.coupon = coupon;
    }

    return this.couponImagesRepository.save(couponImageResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.couponImagesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover a imagem do cupom');
    }

    return 'Imagem do cupom removida com sucesso';
  }
}
