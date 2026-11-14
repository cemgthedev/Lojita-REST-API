import { Order } from '@/entities/order.entity';
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
export class OrderAddress {
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

  @Column({ type: 'varchar', length: 100 })
  recipientName!: string;

  @Column({ type: 'int' })
  orderId!: number;

  @ManyToOne(() => Order, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order?: Order;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
