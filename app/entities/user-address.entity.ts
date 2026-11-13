import { User } from '@/entities/user.entity';
import { TYPE_ADDRESS } from '@/modules/user-address/enums/type-address.enum';

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
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: TYPE_ADDRESS,
    default: TYPE_ADDRESS.HOME,
  })
  type!: TYPE_ADDRESS;

  @Column({ type: 'varchar', length: 9 })
  cep!: string;

  @Column({ type: 'varchar', length: 150 })
  street!: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Column({ type: 'varchar', length: 2 })
  state!: string;

  @Column({ type: 'varchar', length: 100 })
  neighborhood!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  number?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  complement?: string | null;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
