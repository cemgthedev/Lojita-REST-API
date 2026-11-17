import { PaginationResponse } from '@/common/types/pagination-response.type';
import { Message } from '@/entities/message.entity';
import { ChatsService } from '@/modules/chats/chats.service';
import { QueryMessageDto } from '@/modules/messages/dto/query-message.dto';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

export type MessagesResponse = {
  data: Message[];
  meta: PaginationResponse;
};

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
  ) {}

  async create(message: CreateMessageDto) {
    await this.validateReferences(message);

    const newMessage = this.messagesRepository.create(message);

    return this.messagesRepository.save(newMessage);
  }

  async query(query: QueryMessageDto): Promise<MessagesResponse> {
    const { chatId, senderId, content, limit = 10, page = 1 } = query;
    const queryBuilder = this.messagesRepository.createQueryBuilder('message');

    queryBuilder.leftJoinAndSelect('message.chat', 'chat');
    queryBuilder.leftJoinAndSelect('message.sender', 'sender');

    if (chatId !== undefined) {
      queryBuilder.andWhere('message.chatId = :chatId', { chatId });
    }

    if (senderId !== undefined) {
      queryBuilder.andWhere('message.senderId = :senderId', { senderId });
    }

    if (content) {
      queryBuilder.andWhere('message.content ILIKE :content', {
        content: `%${content}%`,
      });
    }

    const [messages, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: { chat: true, sender: true },
    });

    if (!message) {
      throw new NotFoundException(`Mensagem de id #${id} não foi encontrada`);
    }

    return message;
  }

  async update(id: number, message: UpdateMessageDto) {
    const messageResponse = await this.findOne(id);

    await this.validateReferences(message);

    Object.assign(messageResponse, message);

    return this.messagesRepository.save(messageResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.messagesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException('Não foi possível remover a mensagem');
    }

    return 'Mensagem removida com sucesso';
  }

  private async validateReferences(
    message: CreateMessageDto | UpdateMessageDto,
  ) {
    if (message.chatId !== undefined) {
      await this.chatsService.findOne(message.chatId);
    }

    if (message.senderId !== undefined) {
      await this.usersService.findOne(message.senderId);
    }
  }
}
