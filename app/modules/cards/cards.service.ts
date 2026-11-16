import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Card } from '@/entities/card.entity';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { PaymentMethodsService } from '@/modules/payment-methods/payment-methods.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCardDto } from './dto/create-card.dto';
import { QueryCardDto } from './dto/query-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

export type CardsResponse = {
  data: Card[];
  meta: PaginationResponse;
};

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  async create(card: CreateCardDto) {
    const paymentMethod = await this.validatePaymentMethod(
      card.paymentMethodId,
    );
    await this.ensurePaymentMethodDoesNotHaveCard(card.paymentMethodId);

    const newCard = this.cardsRepository.create({
      ...card,
      paymentMethod,
    });

    return this.cardsRepository.save(newCard);
  }

  async query(query: QueryCardDto): Promise<CardsResponse> {
    const { name, brand, last4, paymentMethodId, limit = 10, page = 1 } = query;
    const queryBuilder = this.cardsRepository.createQueryBuilder('card');

    queryBuilder.leftJoinAndSelect('card.paymentMethod', 'paymentMethod');

    if (name) {
      queryBuilder.andWhere('card.name ILIKE :name', { name: `%${name}%` });
    }

    if (brand) {
      queryBuilder.andWhere('card.brand ILIKE :brand', { brand: `%${brand}%` });
    }

    if (last4) {
      queryBuilder.andWhere('card.last4 = :last4', { last4 });
    }

    if (paymentMethodId !== undefined) {
      queryBuilder.andWhere('card.paymentMethodId = :paymentMethodId', {
        paymentMethodId,
      });
    }

    const [cards, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: cards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const card = await this.cardsRepository.findOne({
      where: { id },
      relations: { paymentMethod: true },
    });

    if (!card) {
      throw new NotFoundException(`Cartão de id #${id} não foi encontrado`);
    }

    return card;
  }

  async update(id: number, card: UpdateCardDto) {
    const cardResponse = await this.findOne(id);
    let paymentMethod: PaymentMethod | undefined;

    if (card.paymentMethodId !== undefined) {
      paymentMethod = await this.validatePaymentMethod(card.paymentMethodId);
    }

    const nextPaymentMethodId =
      card.paymentMethodId ?? cardResponse.paymentMethodId;
    await this.ensurePaymentMethodDoesNotHaveCard(nextPaymentMethodId, id);

    Object.assign(cardResponse, card);

    if (paymentMethod) {
      cardResponse.paymentMethod = paymentMethod;
    }

    return this.cardsRepository.save(cardResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.cardsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o cartão');
    }

    return 'Cartão removido com sucesso';
  }

  private async validatePaymentMethod(paymentMethodId: number) {
    const paymentMethod =
      await this.paymentMethodsService.findOne(paymentMethodId);

    if (paymentMethod.type !== PAYMENT_METHOD_TYPE.CARD) {
      throw new BadRequestException(
        'O método de pagamento associado deve ser do tipo cartão',
      );
    }

    return paymentMethod;
  }

  private async ensurePaymentMethodDoesNotHaveCard(
    paymentMethodId: number,
    excludeId?: number,
  ) {
    const card = await this.cardsRepository.findOne({
      where: { paymentMethodId },
    });

    if (card && card.id !== excludeId) {
      throw new ConflictException(
        `O método de pagamento de id #${paymentMethodId} já possui um cartão`,
      );
    }
  }
}
