import { Chat } from '@/entities/chat.entity';
import { User } from '@/entities/user.entity';
import { Role } from '@/modules/users/enums/role.enum';

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
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 2000,
  })
  content!: string;

  @Column({ type: 'int' })
  chatId!: number;

  @ManyToOne(() => Chat, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'chatId', referencedColumnName: 'id' })
  chat?: Chat;

  @Column({ type: 'int' })
  senderId!: number;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'senderId', referencedColumnName: 'id' })
  sender?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
