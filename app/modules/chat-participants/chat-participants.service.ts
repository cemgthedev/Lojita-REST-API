import { PaginationResponse } from '@/common/types/pagination-response.type';
import { ChatParticipant } from '@/entities/chat-participant.entity';
import { ChatsService } from '@/modules/chats/chats.service';
import { QueryChatParticipantDto } from '@/modules/chat-participants/dto/query-chat-participant.dto';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatParticipantDto } from './dto/create-chat-participant.dto';
import { UpdateChatParticipantDto } from './dto/update-chat-participant.dto';

export type ChatParticipantsResponse = {
  data: ChatParticipant[];
  meta: PaginationResponse;
};

@Injectable()
export class ChatParticipantsService {
  constructor(
    @InjectRepository(ChatParticipant)
    private readonly chatParticipantsRepository: Repository<ChatParticipant>,
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
  ) {}

  async create(chatParticipant: CreateChatParticipantDto) {
    await this.validateReferences(chatParticipant);
    await this.ensureParticipantDoesNotExist(
      chatParticipant.chatId,
      chatParticipant.userId,
    );

    const newChatParticipant = this.chatParticipantsRepository.create(
      chatParticipant,
    );

    return this.chatParticipantsRepository.save(newChatParticipant);
  }

  async query(query: QueryChatParticipantDto): Promise<ChatParticipantsResponse> {
    const { chatId, userId, role, limit = 10, page = 1 } = query;
    const queryBuilder =
      this.chatParticipantsRepository.createQueryBuilder('chatParticipant');

    queryBuilder.leftJoinAndSelect('chatParticipant.chat', 'chat');
    queryBuilder.leftJoinAndSelect('chatParticipant.user', 'user');

    if (chatId !== undefined) {
      queryBuilder.andWhere('chatParticipant.chatId = :chatId', { chatId });
    }

    if (userId !== undefined) {
      queryBuilder.andWhere('chatParticipant.userId = :userId', { userId });
    }

    if (role !== undefined) {
      queryBuilder.andWhere('chatParticipant.role = :role', { role });
    }

    const [participants, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: participants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const chatParticipant = await this.chatParticipantsRepository.findOne({
      where: { id },
      relations: { chat: true, user: true },
    });

    if (!chatParticipant) {
      throw new NotFoundException(
        `Participante de chat de id #${id} não foi encontrado`,
      );
    }

    return chatParticipant;
  }

  async update(id: number, chatParticipant: UpdateChatParticipantDto) {
    const chatParticipantResponse = await this.findOne(id);
    const nextChatId = chatParticipant.chatId ?? chatParticipantResponse.chatId;
    const nextUserId = chatParticipant.userId ?? chatParticipantResponse.userId;

    await this.validateReferences(chatParticipant);
    await this.ensureParticipantDoesNotExist(nextChatId, nextUserId, id);

    Object.assign(chatParticipantResponse, chatParticipant);

    return this.chatParticipantsRepository.save(chatParticipantResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.chatParticipantsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o participante do chat',
      );
    }

    return 'Participante do chat removido com sucesso';
  }

  private async validateReferences(
    chatParticipant: UpdateChatParticipantDto | CreateChatParticipantDto,
  ) {
    if (chatParticipant.chatId !== undefined) {
      await this.chatsService.findOne(chatParticipant.chatId);
    }

    if (chatParticipant.userId !== undefined) {
      await this.usersService.findOne(chatParticipant.userId);
    }
  }

  private async ensureParticipantDoesNotExist(
    chatId: number,
    userId: number,
    excludeId?: number,
  ) {
    const duplicate = await this.chatParticipantsRepository.findOne({
      where: { chatId, userId },
    });

    if (duplicate && duplicate.id !== excludeId) {
      throw new ConflictException(
        'Este usuário já está participando deste chat',
      );
    }
  }
}
