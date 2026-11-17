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
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['chatId', 'userId'])
export class ChatParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: Role,
  })
  role!: Role;

  @Column({ type: 'int' })
  chatId!: number;

  @ManyToOne(() => Chat, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'chatId', referencedColumnName: 'id' })
  chat?: Chat;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
