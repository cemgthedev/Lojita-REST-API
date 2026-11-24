jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Message } from '@/entities/message.entity';
import { CreateMessageDto } from '@/modules/messages/dto/create-message.dto';
import { QueryMessageDto } from '@/modules/messages/dto/query-message.dto';
import { UpdateMessageDto } from '@/modules/messages/dto/update-message.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

type MessagesServiceMock = jest.Mocked<
  Pick<MessagesService, 'create' | 'query' | 'findOne' | 'update' | 'remove'>
>;

describe('MessagesController', () => {
  let controller: MessagesController;
  let messagesService: MessagesServiceMock;

  const messageDto: CreateMessageDto = {
    content: 'Hello, I need help with my order.',
    chatId: 5,
    senderId: 7,
  };

  const message: Message = {
    id: 1,
    ...messageDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    messagesService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [{ provide: MessagesService, useValue: messagesService }],
    }).compile();

    controller = moduleRef.get(MessagesController);
  });

  describe('create', () => {
    it('should pass the message data to the service and return the message', async () => {
      messagesService.create.mockResolvedValue(message);

      await expect(controller.create(messageDto)).resolves.toEqual(message);
      expect(messagesService.create).toHaveBeenCalledWith(messageDto);
    });

    it('should propagate not found when a related record does not exist', async () => {
      const error = new NotFoundException('Chat de id #5 não foi encontrado');
      messagesService.create.mockRejectedValue(error);

      await expect(controller.create(messageDto)).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('should pass filters to the service and return matching messages', async () => {
      const query: QueryMessageDto = {
        chatId: 5,
        senderId: 7,
        content: 'order',
        limit: 10,
        page: 1,
      };
      const result = {
        data: [message],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      messagesService.query.mockResolvedValue(result);

      await expect(controller.findAll(query)).resolves.toEqual(result);
      expect(messagesService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar mensagens');
      messagesService.query.mockRejectedValue(error);

      await expect(controller.findAll({} as QueryMessageDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the message id to the service and return the message', async () => {
      messagesService.findOne.mockResolvedValue(message);

      await expect(controller.findOne(1)).resolves.toEqual(message);
      expect(messagesService.findOne).toHaveBeenCalledWith(1);
    });

    it('should propagate not found when the message does not exist', async () => {
      const error = new NotFoundException(
        'Mensagem de id #99 não foi encontrada',
      );
      messagesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the message id and update data to the service', async () => {
      const updateDto: UpdateMessageDto = {
        content: 'Updated message',
      };
      const updated = { ...message, ...updateDto };
      messagesService.update.mockResolvedValue(updated);

      await expect(controller.update(1, updateDto)).resolves.toEqual(updated);
      expect(messagesService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should propagate not found when the message does not exist', async () => {
      const error = new NotFoundException(
        'Mensagem de id #99 não foi encontrada',
      );
      messagesService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { content: 'Updated message' }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should convert the id and return the service result', async () => {
      messagesService.remove.mockResolvedValue('Mensagem removida com sucesso');

      await expect(controller.remove(1)).resolves.toBe(
        'Mensagem removida com sucesso',
      );
      expect(messagesService.remove).toHaveBeenCalledWith(1);
    });

    it('should propagate not found when the message does not exist', async () => {
      const error = new NotFoundException(
        'Mensagem de id #99 não foi encontrada',
      );
      messagesService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the message cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover a mensagem',
      );
      messagesService.remove.mockRejectedValue(error);

      await expect(controller.remove(1)).rejects.toBe(error);
    });
  });
});
