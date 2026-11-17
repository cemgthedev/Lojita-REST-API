import { Chat } from '@/entities/chat.entity';
import { User } from '@/entities/user.entity';
import {
  TICKET_MOTIVE,
  TICKET_ORIGIN,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from '@/modules/support-tickets/enums/ticket.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TICKET_ORIGIN })
  origin!: TICKET_ORIGIN;

  @Column({ type: 'enum', enum: TICKET_MOTIVE })
  motive!: TICKET_MOTIVE;

  @Column({ type: 'enum', enum: TICKET_PRIORITY })
  priority!: TICKET_PRIORITY;

  @Column({ type: 'enum', enum: TICKET_STATUS })
  status!: TICKET_STATUS;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'int' })
  requesterId!: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requesterId', referencedColumnName: 'id' })
  requester?: User;

  @Column({ type: 'int', nullable: true })
  chatId?: number | null;

  @ManyToOne(() => Chat, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'chatId', referencedColumnName: 'id' })
  chat?: Chat | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date | null;
}
