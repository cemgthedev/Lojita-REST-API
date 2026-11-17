import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: CHAT_TYPE, default: CHAT_TYPE.ORDER })
  type!: CHAT_TYPE;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  closedAt?: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
