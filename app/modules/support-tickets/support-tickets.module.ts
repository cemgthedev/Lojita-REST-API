import { SupportTicket } from '@/entities/support-ticket.entity';
import { ChatsModule } from '@/modules/chats/chats.module';
import { UsersModule } from '@/modules/users/users.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket]),
    ChatsModule,
    UsersModule,
  ],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}
