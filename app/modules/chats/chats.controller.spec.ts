jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Chat } from '@/entities/chat.entity';
import { CreateChatDto } from '@/modules/chats/dto/create-chat.dto';
import { QueryChatDto } from '@/modules/chats/dto/query-chat.dto';
import { UpdateChatDto } from '@/modules/chats/dto/update-chat.dto';
import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

type ChatsServiceMock = jest.Mocked<
  Pick<ChatsService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('ChatsController', () => {
  let controller: ChatsController;
  let chatsService: ChatsServiceMock;

  const chatDto: CreateChatDto = {
    type: CHAT_TYPE.CUSTOMER_SUPPORT,
  };

  const chat: Chat = {
    id: 5,
    type: CHAT_TYPE.CUSTOMER_SUPPORT,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    chatsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [{ provide: ChatsService, useValue: chatsService }],
    }).compile();

    controller = moduleRef.get(ChatsController);
  });

  it('should pass chat data to the service on create', async () => {
    chatsService.create.mockResolvedValue(chat);

    await expect(controller.create(chatDto)).resolves.toEqual(chat);
    expect(chatsService.create).toHaveBeenCalledWith(chatDto);
  });

  it('should pass query filters to the service', async () => {
    const query: QueryChatDto = {
      type: CHAT_TYPE.CUSTOMER_SUPPORT,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [chat],
      meta: { total: 1, limit: 10, page: 1, totalPages: 1 },
    };
    chatsService.query.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(chatsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass the chat id to the service and propagate not found', async () => {
    const error = new NotFoundException('Chat de id #99 não foi encontrado');
    chatsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(chatsService.findOne).toHaveBeenCalledWith(99);
  });

  it('should convert the id and pass update data to the service', async () => {
    const updateDto: UpdateChatDto = { type: CHAT_TYPE.ORDER };
    const updated = { ...chat, ...updateDto };
    chatsService.update.mockResolvedValue(updated);

    await expect(controller.update(5, updateDto)).resolves.toEqual(updated);
    expect(chatsService.update).toHaveBeenCalledWith(5, updateDto);
  });

  it('should pass the id to remove and propagate conflicts', async () => {
    const error = new ConflictException('Não foi possível remover o chat');
    chatsService.remove.mockRejectedValue(error);

    await expect(controller.remove(5)).rejects.toBe(error);
    expect(chatsService.remove).toHaveBeenCalledWith(5);
  });
});
