import { User } from '@/entities/user.entity';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';

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
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ORDER_STATUS,
    default: ORDER_STATUS.PENDING,
  })
  status!: ORDER_STATUS;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingTotal!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountTotal!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: string;

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
