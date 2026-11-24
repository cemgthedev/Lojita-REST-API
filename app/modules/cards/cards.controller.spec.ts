jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Card } from '@/entities/card.entity';
import { CreateCardDto } from '@/modules/cards/dto/create-card.dto';
import { QueryCardDto } from '@/modules/cards/dto/query-card.dto';
import { UpdateCardDto } from '@/modules/cards/dto/update-card.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

type CardsServiceMock = jest.Mocked<
  Pick<CardsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('CardsController', () => {
  let controller: CardsController;
  let cardsService: CardsServiceMock;

  const cardDto: CreateCardDto = {
    name: 'Cartão pessoal',
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030,
    paymentMethodId: 3,
  };

  const card: Card = {
    id: 1,
    ...cardDto,
  };

  beforeEach(async () => {
    cardsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CardsController],
      providers: [{ provide: CardsService, useValue: cardsService }],
    }).compile();

    controller = moduleRef.get(CardsController);
  });

  it('should pass card data to the service on create', async () => {
    cardsService.create.mockResolvedValue(card);

    await expect(controller.create(cardDto)).resolves.toEqual(card);
    expect(cardsService.create).toHaveBeenCalledWith(cardDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryCardDto = {
      brand: 'Visa',
      last4: '4242',
      paymentMethodId: 3,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [card],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    cardsService.query.mockResolvedValue(result);

    await expect(controller.query(query)).resolves.toEqual(result);
    expect(cardsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException('Cartão de id #99 não foi encontrado');
    cardsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(cardsService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateCardDto = { name: 'Cartão novo' };
    const updated = { ...card, ...updateDto };
    cardsService.update.mockResolvedValue(updated);

    await expect(controller.update(card.id, updateDto)).resolves.toEqual(
      updated,
    );
    expect(cardsService.update).toHaveBeenCalledWith(card.id, updateDto);
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException('Não foi possível remover o cartão');
    cardsService.remove.mockRejectedValue(error);

    await expect(controller.remove(card.id)).rejects.toBe(error);
    expect(cardsService.remove).toHaveBeenCalledWith(card.id);
  });
});
