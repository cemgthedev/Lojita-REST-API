jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Chat } from '@/entities/chat.entity';
import { Message } from '@/entities/message.entity';
import { User } from '@/entities/user.entity';
import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { ChatsService } from '@/modules/chats/chats.service';
import { CreateMessageDto } from '@/modules/messages/dto/create-message.dto';
import { QueryMessageDto } from '@/modules/messages/dto/query-message.dto';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let repository: jest.Mocked<Repository<Message>>;
  let chatsService: jest.Mocked<ChatsService>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Message>>;

  const messageDto: CreateMessageDto = {
    content: 'Hello, I need help with my order.',
    chatId: 5,
    senderId: 7,
  };

  const chat: Chat = {
    id: 5,
    type: CHAT_TYPE.CUSTOMER_SUPPORT,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const user: User = {
    id: 7,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createMessage = (): Message => ({
    id: 1,
    ...messageDto,
    chat,
    sender: user,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Message>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Message>>;

    chatsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ChatsService>;
    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new MessagesService(repository, chatsService, usersService);
  });

  describe('create', () => {
    it('should validate the chat and sender before creating the message', async () => {
      const message = createMessage();
      chatsService.findOne.mockResolvedValue(chat);
      usersService.findOne.mockResolvedValue(user);
      repository.create.mockReturnValue(message);
      repository.save.mockResolvedValue(message);

      await expect(service.create(messageDto)).resolves.toEqual(message);
      expect(chatsService.findOne).toHaveBeenCalledWith(messageDto.chatId);
      expect(usersService.findOne).toHaveBeenCalledWith(messageDto.senderId);
      expect(repository.create).toHaveBeenCalledWith(messageDto);
      expect(repository.save).toHaveBeenCalledWith(message);
    });

    it('should not create the message when the chat does not exist', async () => {
      const error = new NotFoundException('Chat de id #5 não foi encontrado');
      chatsService.findOne.mockRejectedValue(error);

      await expect(service.create(messageDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not create the message when the sender does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #7 não foi encontrado',
      );
      chatsService.findOne.mockResolvedValue(chat);
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(messageDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const message = createMessage();
      const filters: QueryMessageDto = {
        chatId: 5,
        senderId: 7,
        content: 'order',
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[message], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [message],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('message');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'message.chat',
        'chat',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'message.sender',
        'sender',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'message.chatId = :chatId',
        { chatId: 5 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'message.senderId = :senderId',
        { senderId: 7 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'message.content ILIKE :content',
        { content: '%order%' },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryMessageDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a message and load its chat and sender', async () => {
      const message = createMessage();
      repository.findOne.mockResolvedValue(message);

      await expect(service.findOne(message.id)).resolves.toEqual(message);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: message.id },
        relations: { chat: true, sender: true },
      });
    });

    it('should throw not found when the message does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Mensagem de id #99 não foi encontrada'),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the message', async () => {
      const existing = createMessage();
      const newChat = { ...chat, id: 6 };
      const newSender = { ...user, id: 8 };
      const updateDto = {
        content: 'The issue is resolved.',
        chatId: 6,
        senderId: 8,
      };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      chatsService.findOne.mockResolvedValue(newChat);
      usersService.findOne.mockResolvedValue(newSender);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(chatsService.findOne).toHaveBeenCalledWith(6);
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the message does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { content: 'Updated content' }),
      ).rejects.toThrow(
        new NotFoundException('Mensagem de id #99 não foi encontrada'),
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(chatsService.findOne).not.toHaveBeenCalled();
      expect(usersService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the message and return a success message', async () => {
      const message = createMessage();
      repository.findOne.mockResolvedValue(message);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(message.id)).resolves.toBe(
        'Mensagem removida com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(message.id);
    });

    it('should throw not found when the message does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException('Mensagem de id #99 não foi encontrada'),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the message is not deleted', async () => {
      const message = createMessage();
      repository.findOne.mockResolvedValue(message);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(message.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover a mensagem'),
      );
    });
  });
});
