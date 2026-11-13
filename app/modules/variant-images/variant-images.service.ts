import { PaginationResponse } from '@/common/types/pagination-response.type';
import { VariantImage } from '@/entities/variant-image.entity';
import { VariantsService } from '@/modules/variants/variants.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVariantImageDto } from './dto/create-variant-image.dto';
import { QueryVariantImageDto } from './dto/query-variant-image.dto';
import { UpdateVariantImageDto } from './dto/update-variant-image.dto';

export type VariantImagesResponse = {
  data: VariantImage[];
  meta: PaginationResponse;
};

@Injectable()
export class VariantImagesService {
  constructor(
    @InjectRepository(VariantImage)
    private readonly variantImagesRepository: Repository<VariantImage>,
    private readonly variantsService: VariantsService,
  ) {}

  async create(variantImage: CreateVariantImageDto) {
    await this.variantsService.findOne(variantImage.variantId);

    const newVariantImage = this.variantImagesRepository.create(variantImage);

    return this.variantImagesRepository.save(newVariantImage);
  }

  async query(query: QueryVariantImageDto): Promise<VariantImagesResponse> {
    const { variantId, url, sortOrder, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.variantImagesRepository.createQueryBuilder('variantImage');

    if (variantId !== undefined) {
      queryBuilder.andWhere('variantImage.variantId = :variantId', {
        variantId,
      });
    }

    if (url) {
      queryBuilder.andWhere('variantImage.url ILIKE :url', {
        url: `%${url}%`,
      });
    }

    if (sortOrder !== undefined) {
      queryBuilder.andWhere('variantImage.sortOrder = :sortOrder', {
        sortOrder,
      });
    }

    const [variantImages, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: variantImages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const variantImage = await this.variantImagesRepository.findOne({
      where: { id },
      relations: { variant: true },
    });

    if (!variantImage) {
      throw new NotFoundException(
        `Imagem da variante de id #${id} não foi encontrada`,
      );
    }

    return variantImage;
  }

  async update(id: number, variantImage: UpdateVariantImageDto) {
    const variantImageResponse = await this.findOne(id);

    if (variantImage.variantId !== undefined) {
      await this.variantsService.findOne(variantImage.variantId);
    }

    Object.assign(variantImageResponse, variantImage);

    return this.variantImagesRepository.save(variantImageResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.variantImagesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover a imagem da variante',
      );
    }

    return 'Imagem da variante removida com sucesso';
  }
}
