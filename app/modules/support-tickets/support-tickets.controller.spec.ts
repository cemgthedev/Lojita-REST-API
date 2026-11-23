jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { SupportTicket } from '@/entities/support-ticket.entity';
import { CreateSupportTicketDto } from '@/modules/support-tickets/dto/create-support-ticket.dto';
import { QuerySupportTicketDto } from '@/modules/support-tickets/dto/query-support-ticket.dto';
import { UpdateSupportTicketDto } from '@/modules/support-tickets/dto/update-support-ticket.dto';
import {
  TICKET_MOTIVE,
  TICKET_ORIGIN,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from '@/modules/support-tickets/enums/ticket.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';

type SupportTicketsServiceMock = jest.Mocked<
  Pick<
    SupportTicketsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('SupportTicketsController', () => {
  let controller: SupportTicketsController;
  let supportTicketsService: SupportTicketsServiceMock;

  const supportTicketDto: CreateSupportTicketDto = {
    origin: TICKET_ORIGIN.CUSTOMER_PORTAL,
    motive: TICKET_MOTIVE.ORDER,
    priority: TICKET_PRIORITY.HIGH,
    status: TICKET_STATUS.OPEN,
    description: 'Pedido atrasado',
    requesterId: 4,
    chatId: 8,
  };

  const supportTicket: SupportTicket = {
    id: 1,
    ...supportTicketDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    supportTicketsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SupportTicketsController],
      providers: [
        { provide: SupportTicketsService, useValue: supportTicketsService },
      ],
    }).compile();

    controller = moduleRef.get(SupportTicketsController);
  });

  describe('create', () => {
    it('should pass the ticket data to the service and return the created ticket', async () => {
      supportTicketsService.create.mockResolvedValue(supportTicket);

      await expect(controller.create(supportTicketDto)).resolves.toEqual(
        supportTicket,
      );
      expect(supportTicketsService.create).toHaveBeenCalledWith(
        supportTicketDto,
      );
    });

    it('should propagate not found when a related record does not exist', async () => {
      const error = new NotFoundException(
        'Usuário de id #4 não foi encontrado',
      );
      supportTicketsService.create.mockRejectedValue(error);

      await expect(controller.create(supportTicketDto)).rejects.toBe(error);
    });
  });

  describe('query', () => {
    it('should pass filters to the service and return matching tickets', async () => {
      const query: QuerySupportTicketDto = {
        status: TICKET_STATUS.OPEN,
        requesterId: 4,
        limit: 10,
        page: 1,
      };
      const result = {
        data: [supportTicket],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      supportTicketsService.query.mockResolvedValue(result);

      await expect(controller.query(query)).resolves.toEqual(result);
      expect(supportTicketsService.query).toHaveBeenCalledWith(query);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Falha ao consultar chamados de suporte');
      supportTicketsService.query.mockRejectedValue(error);

      await expect(controller.query({} as QuerySupportTicketDto)).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne', () => {
    it('should pass the ticket id to the service and return the ticket', async () => {
      supportTicketsService.findOne.mockResolvedValue(supportTicket);

      await expect(controller.findOne(supportTicket.id)).resolves.toEqual(
        supportTicket,
      );
      expect(supportTicketsService.findOne).toHaveBeenCalledWith(
        supportTicket.id,
      );
    });

    it('should propagate not found when the ticket does not exist', async () => {
      const error = new NotFoundException(
        'Chamado de suporte de id #99 não foi encontrado',
      );
      supportTicketsService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(99)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('should pass the ticket id and update data to the service', async () => {
      const updateDto: UpdateSupportTicketDto = {
        status: TICKET_STATUS.RESOLVED,
      };
      const updated = { ...supportTicket, ...updateDto };
      supportTicketsService.update.mockResolvedValue(updated);

      await expect(
        controller.update(supportTicket.id, updateDto),
      ).resolves.toEqual(updated);
      expect(supportTicketsService.update).toHaveBeenCalledWith(
        supportTicket.id,
        updateDto,
      );
    });

    it('should propagate not found when the ticket does not exist', async () => {
      const error = new NotFoundException(
        'Chamado de suporte de id #99 não foi encontrado',
      );
      supportTicketsService.update.mockRejectedValue(error);

      await expect(
        controller.update(99, { status: TICKET_STATUS.CLOSED }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('should pass the ticket id to the service and return its result', async () => {
      supportTicketsService.remove.mockResolvedValue(
        'Chamado de suporte removido com sucesso',
      );

      await expect(controller.remove(supportTicket.id)).resolves.toBe(
        'Chamado de suporte removido com sucesso',
      );
      expect(supportTicketsService.remove).toHaveBeenCalledWith(
        supportTicket.id,
      );
    });

    it('should propagate not found when the ticket does not exist', async () => {
      const error = new NotFoundException(
        'Chamado de suporte de id #99 não foi encontrado',
      );
      supportTicketsService.remove.mockRejectedValue(error);

      await expect(controller.remove(99)).rejects.toBe(error);
    });

    it('should propagate a conflict when the ticket cannot be deleted', async () => {
      const error = new ConflictException(
        'Não foi possível remover o chamado de suporte',
      );
      supportTicketsService.remove.mockRejectedValue(error);

      await expect(controller.remove(supportTicket.id)).rejects.toBe(error);
    });
  });
});
