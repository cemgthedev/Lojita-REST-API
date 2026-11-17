import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Chat } from '@/entities/chat.entity';
import { QueryChatDto } from '@/modules/chats/dto/query-chat.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

export type ChatsResponse = {
  data: Chat[];
  meta: PaginationResponse;
};

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    readonly chatsRepository: Repository<Chat>,
  ) {}

  async create(chat: CreateChatDto) {
    const newChat = this.chatsRepository.create(chat);

    return this.chatsRepository.save(newChat);
  }

  async query(query: QueryChatDto) {
    const { type, limit, page } = query;
    const queryBuilder = this.chatsRepository.createQueryBuilder('chat');

    if (type) {
      queryBuilder.andWhere('chat.type = :type', { type });
    }

    const [chats, total] = await queryBuilder
      .take(limit ?? 10)
      .skip((page - 1) * (limit ?? 10))
      .getManyAndCount();

    const response: ChatsResponse = {
      data: chats,
      meta: {
        total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };

    return response;
  }

  async findOne(id: number) {
    const chat: Chat | null = await this.chatsRepository.findOne({
      where: { id },
    });

    if (!chat) {
      throw new NotFoundException(`Chat de id #${id} não foi encontrado`);
    }

    return chat;
  }

  async update(id: number, chat: UpdateChatDto) {
    const chatResponse: Chat | null = await this.findOne(id);

    if (!chatResponse) {
      throw new NotFoundException('Chat não foi encontrado');
    }

    Object.assign(chatResponse, chat);

    return this.chatsRepository.save(chatResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.chatsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover o chat');
    }

    return 'Chat removido com sucesso';
  }
}
