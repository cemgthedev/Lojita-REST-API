import { PaginationResponse } from '@/common/types/pagination-response.type';
import { SupportTicket } from '@/entities/support-ticket.entity';
import { ChatsService } from '@/modules/chats/chats.service';
import { UsersService } from '@/modules/users/users.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { QuerySupportTicketDto } from './dto/query-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

export type SupportTicketsResponse = {
  data: SupportTicket[];
  meta: PaginationResponse;
};

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketsRepository: Repository<SupportTicket>,
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
  ) {}

  async create(supportTicket: CreateSupportTicketDto) {
    await this.validateReferences(supportTicket);

    const newSupportTicket =
      this.supportTicketsRepository.create(supportTicket);

    return this.supportTicketsRepository.save(newSupportTicket);
  }

  async query(query: QuerySupportTicketDto): Promise<SupportTicketsResponse> {
    const {
      origin,
      priority,
      status,
      motive,
      requesterId,
      chatId,
      limit = 10,
      page = 1,
    } = query;
    const queryBuilder =
      this.supportTicketsRepository.createQueryBuilder('supportTicket');

    queryBuilder.leftJoinAndSelect('supportTicket.requester', 'requester');
    queryBuilder.leftJoinAndSelect('supportTicket.chat', 'chat');

    if (origin !== undefined) {
      queryBuilder.andWhere('supportTicket.origin = :origin', { origin });
    }

    if (priority !== undefined) {
      queryBuilder.andWhere('supportTicket.priority = :priority', {
        priority,
      });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('supportTicket.status = :status', { status });
    }

    if (motive) {
      queryBuilder.andWhere('supportTicket.motive = :motive', { motive });
    }

    if (requesterId !== undefined) {
      queryBuilder.andWhere('supportTicket.requesterId = :requesterId', {
        requesterId,
      });
    }

    if (chatId !== undefined) {
      queryBuilder.andWhere('supportTicket.chatId = :chatId', { chatId });
    }

    const [tickets, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const supportTicket = await this.supportTicketsRepository.findOne({
      where: { id },
      relations: { requester: true, chat: true },
    });

    if (!supportTicket) {
      throw new NotFoundException(
        `Chamado de suporte de id #${id} não foi encontrado`,
      );
    }

    return supportTicket;
  }

  async update(id: number, supportTicket: UpdateSupportTicketDto) {
    const supportTicketResponse = await this.findOne(id);

    await this.validateReferences(supportTicket);
    Object.assign(supportTicketResponse, supportTicket);

    return this.supportTicketsRepository.save(supportTicketResponse);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.supportTicketsRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(
        'Não foi possível remover o chamado de suporte',
      );
    }

    return 'Chamado de suporte removido com sucesso';
  }

  private async validateReferences(
    supportTicket: CreateSupportTicketDto | UpdateSupportTicketDto,
  ) {
    if (supportTicket.requesterId !== undefined) {
      await this.usersService.findOne(supportTicket.requesterId);
    }

    if (supportTicket.chatId !== undefined && supportTicket.chatId !== null) {
      await this.chatsService.findOne(supportTicket.chatId);
    }
  }
}
