jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Chat } from '@/entities/chat.entity';
import { ChatParticipant } from '@/entities/chat-participant.entity';
import { User } from '@/entities/user.entity';
import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { ChatsService } from '@/modules/chats/chats.service';
import { CreateChatParticipantDto } from '@/modules/chat-participants/dto/create-chat-participant.dto';
import { QueryChatParticipantDto } from '@/modules/chat-participants/dto/query-chat-participant.dto';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { ChatParticipantsService } from './chat-participants.service';

describe('ChatParticipantsService', () => {
  let service: ChatParticipantsService;
  let repository: jest.Mocked<Repository<ChatParticipant>>;
  let chatsService: jest.Mocked<Pick<ChatsService, 'findOne'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findOne'>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ChatParticipant>>;

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

  const participantDto: CreateChatParticipantDto = {
    chatId: chat.id,
    userId: user.id,
    role: Role.CUSTOMER,
  };

  const createParticipant = (): ChatParticipant => ({
    id: 1,
    ...participantDto,
    chat,
    user,
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
    } as unknown as jest.Mocked<SelectQueryBuilder<ChatParticipant>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChatParticipant>>;

    chatsService = { findOne: jest.fn() };
    usersService = { findOne: jest.fn() };
    service = new ChatParticipantsService(
      repository,
      chatsService as unknown as ChatsService,
      usersService as unknown as UsersService,
    );
  });

  describe('create', () => {
    it('should validate references and create a participant', async () => {
      const participant = createParticipant();
      chatsService.findOne.mockResolvedValue(chat);
      usersService.findOne.mockResolvedValue(user);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(participant);
      repository.save.mockResolvedValue(participant);

      await expect(service.create(participantDto)).resolves.toEqual(
        participant,
      );
      expect(chatsService.findOne).toHaveBeenCalledWith(chat.id);
      expect(usersService.findOne).toHaveBeenCalledWith(user.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { chatId: chat.id, userId: user.id },
      });
      expect(repository.create).toHaveBeenCalledWith(participantDto);
      expect(repository.save).toHaveBeenCalledWith(participant);
    });

    it('should not create a participant when its chat does not exist', async () => {
      const error = new NotFoundException('Chat de id #5 não foi encontrado');
      chatsService.findOne.mockRejectedValue(error);

      await expect(service.create(participantDto)).rejects.toBe(error);
      expect(usersService.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should reject a duplicate participant', async () => {
      repository.findOne.mockResolvedValue(createParticipant());

      await expect(service.create(participantDto)).rejects.toThrow(
        new ConflictException('Este usuário já está participando deste chat'),
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and paginate results', async () => {
      const participant = createParticipant();
      const filters: QueryChatParticipantDto = {
        chatId: chat.id,
        userId: user.id,
        role: Role.CUSTOMER,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[participant], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [participant],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'chatParticipant',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'chatParticipant.chat',
        'chat',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'chatParticipant.user',
        'user',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'chatParticipant.chatId = :chatId',
        { chatId: chat.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'chatParticipant.userId = :userId',
        { userId: user.id },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'chatParticipant.role = :role',
        { role: Role.CUSTOMER },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.query(new QueryChatParticipantDto()),
      ).resolves.toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a participant and load its chat and user', async () => {
      const participant = createParticipant();
      repository.findOne.mockResolvedValue(participant);

      await expect(service.findOne(participant.id)).resolves.toEqual(
        participant,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: participant.id },
        relations: { chat: true, user: true },
      });
    });

    it('should throw not found when the participant does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Participante de chat de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the participant', async () => {
      const existing = createParticipant();
      const updated = {
        ...existing,
        userId: 8,
        role: Role.SUPPORT,
      };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      usersService.findOne.mockResolvedValue({ ...user, id: 8 });
      repository.save.mockResolvedValue(updated);

      await expect(
        service.update(existing.id, {
          userId: 8,
          role: Role.SUPPORT,
        }),
      ).resolves.toEqual(updated);
      expect(usersService.findOne).toHaveBeenCalledWith(8);
      expect(repository.findOne).toHaveBeenNthCalledWith(2, {
        where: { chatId: chat.id, userId: 8 },
      });
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should reject an update that duplicates another participant', async () => {
      const existing = createParticipant();
      const duplicate = { ...existing, id: 2, userId: 8 };
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(duplicate);
      usersService.findOne.mockResolvedValue({ ...user, id: 8 });

      await expect(service.update(existing.id, { userId: 8 })).rejects.toThrow(
        new ConflictException('Este usuário já está participando deste chat'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not save when the participant does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { role: Role.SUPPORT })).rejects.toThrow(
        new NotFoundException(
          'Participante de chat de id #99 não foi encontrado',
        ),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete the participant and return a success message', async () => {
      const participant = createParticipant();
      repository.findOne.mockResolvedValue(participant);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(participant.id)).resolves.toBe(
        'Participante do chat removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(participant.id);
    });

    it('should throw a conflict when the participant is not deleted', async () => {
      const participant = createParticipant();
      repository.findOne.mockResolvedValue(participant);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(participant.id)).rejects.toThrow(
        new ConflictException(
          'Não foi possível remover o participante do chat',
        ),
      );
    });
  });
});
