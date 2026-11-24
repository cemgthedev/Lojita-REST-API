jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new (...args: never[]) => object) => classRef,
}));

import 'reflect-metadata';
import { ChatParticipant } from '@/entities/chat-participant.entity';
import { CreateChatParticipantDto } from '@/modules/chat-participants/dto/create-chat-participant.dto';
import { QueryChatParticipantDto } from '@/modules/chat-participants/dto/query-chat-participant.dto';
import { UpdateChatParticipantDto } from '@/modules/chat-participants/dto/update-chat-participant.dto';
import { Role } from '@/modules/users/enums/role.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChatParticipantsController } from './chat-participants.controller';
import { ChatParticipantsService } from './chat-participants.service';

type ChatParticipantsServiceMock = jest.Mocked<
  Pick<
    ChatParticipantsService,
    'create' | 'query' | 'findOne' | 'update' | 'remove'
  >
>;

describe('ChatParticipantsController', () => {
  let controller: ChatParticipantsController;
  let chatParticipantsService: ChatParticipantsServiceMock;

  const participantDto: CreateChatParticipantDto = {
    chatId: 5,
    userId: 7,
    role: Role.CUSTOMER,
  };

  const participant: ChatParticipant = {
    id: 1,
    ...participantDto,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    chatParticipantsService = {
      create: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChatParticipantsController],
      providers: [
        { provide: ChatParticipantsService, useValue: chatParticipantsService },
      ],
    }).compile();

    controller = moduleRef.get(ChatParticipantsController);
  });

  it('should pass participant data to the service on create', async () => {
    chatParticipantsService.create.mockResolvedValue(participant);

    await expect(controller.create(participantDto)).resolves.toEqual(
      participant,
    );
    expect(chatParticipantsService.create).toHaveBeenCalledWith(participantDto);
  });

  it('should pass filters to the service on query', async () => {
    const query: QueryChatParticipantDto = {
      chatId: 5,
      userId: 7,
      role: Role.CUSTOMER,
      limit: 10,
      page: 1,
    };
    const result = {
      data: [participant],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    chatParticipantsService.query.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(chatParticipantsService.query).toHaveBeenCalledWith(query);
  });

  it('should pass an id to findOne and propagate not found', async () => {
    const error = new NotFoundException(
      'Participante de chat de id #99 não foi encontrado',
    );
    chatParticipantsService.findOne.mockRejectedValue(error);

    await expect(controller.findOne(99)).rejects.toBe(error);
    expect(chatParticipantsService.findOne).toHaveBeenCalledWith(99);
  });

  it('should pass an id and update data to the service', async () => {
    const updateDto: UpdateChatParticipantDto = { role: Role.SUPPORT };
    const updated = { ...participant, ...updateDto };
    chatParticipantsService.update.mockResolvedValue(updated);

    await expect(controller.update(1, updateDto)).resolves.toEqual(updated);
    expect(chatParticipantsService.update).toHaveBeenCalledWith(1, updateDto);
  });

  it('should pass an id to remove and propagate conflicts', async () => {
    const error = new ConflictException(
      'Não foi possível remover o participante do chat',
    );
    chatParticipantsService.remove.mockRejectedValue(error);

    await expect(controller.remove(1)).rejects.toBe(error);
    expect(chatParticipantsService.remove).toHaveBeenCalledWith(1);
  });
});
