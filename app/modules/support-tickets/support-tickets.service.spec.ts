jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { Chat } from '@/entities/chat.entity';
import { SupportTicket } from '@/entities/support-ticket.entity';
import { User } from '@/entities/user.entity';
import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { ChatsService } from '@/modules/chats/chats.service';
import { CreateSupportTicketDto } from '@/modules/support-tickets/dto/create-support-ticket.dto';
import { QuerySupportTicketDto } from '@/modules/support-tickets/dto/query-support-ticket.dto';
import {
  TICKET_MOTIVE,
  TICKET_ORIGIN,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from '@/modules/support-tickets/enums/ticket.enum';
import { Role } from '@/modules/users/enums/role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { SupportTicketsService } from './support-tickets.service';

describe('SupportTicketsService', () => {
  let service: SupportTicketsService;
  let repository: jest.Mocked<Repository<SupportTicket>>;
  let chatsService: jest.Mocked<ChatsService>;
  let usersService: jest.Mocked<UsersService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<SupportTicket>>;

  const supportTicketDto: CreateSupportTicketDto = {
    origin: TICKET_ORIGIN.CUSTOMER_PORTAL,
    motive: TICKET_MOTIVE.ORDER,
    priority: TICKET_PRIORITY.HIGH,
    status: TICKET_STATUS.OPEN,
    description: 'Pedido atrasado',
    requesterId: 4,
    chatId: 8,
  };

  const createSupportTicket = (): SupportTicket => ({
    id: 1,
    ...supportTicketDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const user: User = {
    id: 4,
    name: 'Ana Silva',
    email: 'ana@example.com',
    password: 'password',
    role: Role.CUSTOMER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const chat: Chat = {
    id: 8,
    type: CHAT_TYPE.ORDER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<SupportTicket>>;

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<SupportTicket>>;

    chatsService = {
      chatsRepository: {} as ChatsService['chatsRepository'],
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    usersService = {
      usersRepository: {} as UsersService['usersRepository'],
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    service = new SupportTicketsService(repository, chatsService, usersService);
  });

  describe('create', () => {
    it('should validate the requester and chat before creating the ticket', async () => {
      const ticket = createSupportTicket();
      usersService.findOne.mockResolvedValue(user);
      chatsService.findOne.mockResolvedValue(chat);
      repository.create.mockReturnValue(ticket);
      repository.save.mockResolvedValue(ticket);

      await expect(service.create(supportTicketDto)).resolves.toEqual(ticket);
      expect(usersService.findOne).toHaveBeenCalledWith(
        supportTicketDto.requesterId,
      );
      expect(chatsService.findOne).toHaveBeenCalledWith(
        supportTicketDto.chatId,
      );
      expect(repository.create).toHaveBeenCalledWith(supportTicketDto);
      expect(repository.save).toHaveBeenCalledWith(ticket);
    });

    it('should not create the ticket when the requester does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #4 não foi encontrado',
      );
      usersService.findOne.mockRejectedValue(error);

      await expect(service.create(supportTicketDto)).rejects.toBe(error);
      expect(chatsService.findOne).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should not create the ticket when the chat does not exist', async () => {
      const error = new NotFoundException('Chat de id #8 não foi encontrado');
      usersService.findOne.mockResolvedValue(user);
      chatsService.findOne.mockRejectedValue(error);

      await expect(service.create(supportTicketDto)).rejects.toBe(error);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should join relations, apply filters, and return pagination metadata', async () => {
      const ticket = createSupportTicket();
      const filters: QuerySupportTicketDto = {
        origin: TICKET_ORIGIN.CUSTOMER_PORTAL,
        priority: TICKET_PRIORITY.HIGH,
        status: TICKET_STATUS.OPEN,
        motive: TICKET_MOTIVE.ORDER,
        requesterId: 4,
        chatId: 8,
        limit: 20,
        page: 2,
      };
      queryBuilder.getManyAndCount.mockResolvedValue([[ticket], 35]);

      await expect(service.query(filters)).resolves.toEqual({
        data: [ticket],
        meta: { total: 35, page: 2, limit: 20, totalPages: 2 },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'supportTicket',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        1,
        'supportTicket.requester',
        'requester',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
        2,
        'supportTicket.chat',
        'chat',
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        'supportTicket.origin = :origin',
        { origin: TICKET_ORIGIN.CUSTOMER_PORTAL },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        'supportTicket.priority = :priority',
        { priority: TICKET_PRIORITY.HIGH },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        3,
        'supportTicket.status = :status',
        { status: TICKET_STATUS.OPEN },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        4,
        'supportTicket.motive = :motive',
        { motive: TICKET_MOTIVE.ORDER },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        5,
        'supportTicket.requesterId = :requesterId',
        { requesterId: 4 },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        6,
        'supportTicket.chatId = :chatId',
        { chatId: 8 },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should query without optional filters using default pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await expect(service.query(new QuerySupportTicketDto())).resolves.toEqual(
        {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      );
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('findOne', () => {
    it('should find a ticket and load its requester and chat', async () => {
      const ticket = createSupportTicket();
      repository.findOne.mockResolvedValue(ticket);

      await expect(service.findOne(ticket.id)).resolves.toEqual(ticket);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: ticket.id },
        relations: { requester: true, chat: true },
      });
    });

    it('should throw not found when the ticket does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException(
          'Chamado de suporte de id #99 não foi encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('should validate changed references and update the ticket', async () => {
      const existing = createSupportTicket();
      const updateDto = {
        requesterId: 5,
        chatId: 9,
        status: TICKET_STATUS.RESOLVED,
      };
      const updated = { ...existing, ...updateDto };
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockResolvedValue({ ...user, id: 5 });
      chatsService.findOne.mockResolvedValue({ ...chat, id: 9 });
      repository.save.mockResolvedValue(updated);

      await expect(service.update(existing.id, updateDto)).resolves.toEqual(
        updated,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(5);
      expect(chatsService.findOne).toHaveBeenCalledWith(9);
      expect(repository.save).toHaveBeenCalledWith(updated);
    });

    it('should not save when a changed requester does not exist', async () => {
      const existing = createSupportTicket();
      const error = new NotFoundException(
        'Usuário de id #5 não foi encontrado',
      );
      repository.findOne.mockResolvedValue(existing);
      usersService.findOne.mockRejectedValue(error);

      await expect(
        service.update(existing.id, { requesterId: 5 }),
      ).rejects.toBe(error);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should allow clearing the chat without validating a null chat id', async () => {
      const existing = createSupportTicket();
      const updated = { ...existing, chatId: null };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(
        service.update(existing.id, { chatId: null }),
      ).resolves.toEqual(updated);
      expect(chatsService.findOne).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(updated);
    });
  });

  describe('remove', () => {
    it('should delete the ticket and return a success message', async () => {
      const ticket = createSupportTicket();
      repository.findOne.mockResolvedValue(ticket);
      repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      await expect(service.remove(ticket.id)).resolves.toBe(
        'Chamado de suporte removido com sucesso',
      );
      expect(repository.delete).toHaveBeenCalledWith(ticket.id);
    });

    it('should throw not found when the ticket does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        new NotFoundException(
          'Chamado de suporte de id #99 não foi encontrado',
        ),
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw a conflict when the ticket is not deleted', async () => {
      const ticket = createSupportTicket();
      repository.findOne.mockResolvedValue(ticket);
      repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      await expect(service.remove(ticket.id)).rejects.toThrow(
        new ConflictException('Não foi possível remover o chamado de suporte'),
      );
    });
  });
});
