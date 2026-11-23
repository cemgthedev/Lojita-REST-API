jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Chat } from '@/entities/chat.entity';
import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { QueryChatDto } from './dto/query-chat.dto';
import { ChatsService } from './chats.service';

describe('ChatsService', () => {
  let service: ChatsService;
  let repository: jest.Mocked<Repository<Chat>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Chat>>;

  const chatDto: CreateChatDto = {
    type: CHAT_TYPE.CUSTOMER_SUPPORT,
  };

  const createChat = (): Chat => ({
    id: 5,
    type: CHAT_TYPE.CUSTOMER_SUPPORT,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Chat>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Chat>>;

    service = new ChatsService(repository);
  });

  describe('create', () => {
    it('should create and save a chat', async () => {
      const chat = createChat();
      repository.create.mockReturnValue(chat);
      repository.save.mockResolvedValue(chat);

      await expect(service.create(chatDto)).resolves.toEqual(chat);
      expect(repository.create).toHaveBeenCalledWith(chatDto);
      expect(repository.save).toHaveBeenCalledWith(chat);
    });
  });

  describe('query', () => {
    it('should filter by type and return pagination metadata', async () => {
      const chat = createChat();
      const filters: QueryChatDto = {
        type: CHAT_TYPE.CUSTOMER_SUPPORT,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[chat], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [chat],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('chat');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('chat.type = :type', {
        type: CHAT_TYPE.CUSTOMER_SUPPORT,
      });
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without an optional type using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QueryChatDto())).resolves.toEqual({
        data: [],
        meta: { total: 0, limit: 10, page: 1, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a chat by id', async () => {
      const chat = createChat();
      repository.findOne.mockResolvedValue(chat);

      await expect(service.findOne(chat.id)).resolves.toEqual(chat);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: chat.id },
      });
    });

    it('should throw not found when the chat does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Chat de id #99 não foi encontrado'),
      );
    });
  });

  describe('update', () => {
    it('should update the chat type', async () => {
      const existing = createChat();
      const updateDto = { type: CHAT_TYPE.ORDER };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when the chat does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(99, { type: CHAT_TYPE.ORDER }),
      ).rejects.toThrow(
        new NotFoundException('Chat de id #99 não foi encontrado'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the chat and return a success message', async () => {
      const chat = createChat();
      repository.findOne.mockResolvedValue(chat);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(chat.id)).resolves.toBe(
        'Chat removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(chat.id);
    });

    it('should throw a conflict when the chat is not deleted', async () => {
      const chat = createChat();
      repository.findOne.mockResolvedValue(chat);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(chat.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o chat'),
      );
    });
  });
});
