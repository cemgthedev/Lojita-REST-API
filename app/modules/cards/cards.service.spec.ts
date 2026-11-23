jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Card } from '@/entities/card.entity';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { PAYMENT_METHOD_TYPE } from '@/modules/payment-methods/enums/payment-method-type.enum';
import { PaymentMethodsService } from '@/modules/payment-methods/payment-methods.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateCardDto } from './dto/create-card.dto';
import { QueryCardDto } from './dto/query-card.dto';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  let service: CardsService;
  let repository: jest.Mocked<Repository<Card>>;
  let paymentMethodsService: jest.Mocked<
    Pick<PaymentMethodsService, 'findOne'>
  >;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Card>>;

  const paymentMethod: PaymentMethod = {
    id: 3,
    type: PAYMENT_METHOD_TYPE.CARD,
    method: 'Visa',
    provider: 'Stripe',
    providerToken: 'test-token',
    userId: 7,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const cardDto: CreateCardDto = {
    name: 'Cartão pessoal',
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030,
    paymentMethodId: paymentMethod.id,
  };

  const createCard = (): Card => ({
    id: 1,
    ...cardDto,
    paymentMethod,
  });

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Card>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Card>>;

    paymentMethodsService = { findOne: jest.fn() };
    service = new CardsService(
      repository,
      paymentMethodsService as unknown as PaymentMethodsService,
    );
  });

  describe('create', () => {
    it('should validate the payment method and create the card', async () => {
      const card = createCard();
      paymentMethodsService.findOne.mockResolvedValue(paymentMethod);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(card);
      repository.save.mockResolvedValue(card);

      await expect(service.create(cardDto)).resolves.toEqual(card);
      expect(paymentMethodsService.findOne).toHaveBeenCalledWith(
        cardDto.paymentMethodId,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { paymentMethodId: cardDto.paymentMethodId },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...cardDto,
        paymentMethod,
      });
      expect(repository.save).toHaveBeenCalledWith(card);
    });

    it('should reject a payment method that is not a card', async () => {
      paymentMethodsService.findOne.mockResolvedValue({
        ...paymentMethod,
        type: PAYMENT_METHOD_TYPE.BANK_ACCOUNT,
      });

      await expect(service.create(cardDto)).rejects.toThrow(
        new BadRequestException(
          'O método de pagamento associado deve ser do tipo cartão',
        ),
      );
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should reject a payment method that already has a card', async () => {
      paymentMethodsService.findOne.mockResolvedValue(paymentMethod);
      repository.findOne.mockResolvedValue(createCard());

      await expect(service.create(cardDto)).rejects.toThrow(
        new ConflictException(
          'O método de pagamento de id #3 já possui um cartão',
        ),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join the payment method, apply filters, and paginate results', async () => {
      const card = createCard();
      const filters: QueryCardDto = {
        name: 'pessoal',
        brand: 'Visa',
        last4: '4242',
        paymentMethodId: paymentMethod.id,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[card], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [card],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('card');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'card.paymentMethod',
        'paymentMethod',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'card.name ILIKE :name',
        { name: '%pessoal%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'card.brand ILIKE :brand',
        { brand: '%Visa%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'card.last4 = :last4',
        { last4: '4242' },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'card.paymentMethodId = :paymentMethodId',
        { paymentMethodId: paymentMethod.id },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryCardDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a card and load its payment method', async () => {
      const card = createCard();
      repository.findOne.mockResolvedValue(card);

      await expect(service.findOne(card.id)).resolves.toEqual(card);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: card.id },
        relations: { paymentMethod: true },
      });
    });

    it('should throw not found when the card does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Cartão de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should validate a changed payment method and update the card', async () => {
      const existing = createCard();
      const nextPaymentMethod = { ...paymentMethod, id: 4 };
      const updateDto = {
        name: 'Cartão novo',
        paymentMethodId: nextPaymentMethod.id,
      };
      const updated = {
        ...existing,
        ...updateDto,
        paymentMethod: nextPaymentMethod,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      paymentMethodsService.findOne.mockResolvedValue(nextPaymentMethod);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(paymentMethodsService.findOne).toHaveBeenCalledWith(4);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { paymentMethodId: 4 },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject assigning a payment method that already has a card', async () => {
      const existing = createCard();
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, id: 2, paymentMethodId: 4 });
      paymentMethodsService.findOne.mockResolvedValue({
        ...paymentMethod,
        id: 4,
      });

      await expect(
        service.update(existing.id, { paymentMethodId: 4 }),
      ).rejects.toThrow(
        new ConflictException(
          'O método de pagamento de id #4 já possui um cartão',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the card does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Cartão novo' })).rejects.toThrow(
        new NotFoundException('Cartão de id #99 não foi encontrado'),
      );
      expect(paymentMethodsService.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the card and return a success message', async () => {
      const card = createCard();
      repository.findOne.mockResolvedValue(card);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(card.id)).resolves.toBe(
        'Cartão removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(card.id);
    });

    it('should throw a conflict when the card is not deleted', async () => {
      const card = createCard();
      repository.findOne.mockResolvedValue(card);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(card.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o cartão'),
      );
    });
  });
});
