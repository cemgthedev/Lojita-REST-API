import { Order } from '@/entities/order.entity';
import { Variant } from '@/entities/variant.entity';

import { User } from '@/entities/user.entity';
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
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: string;

  @Column({ type: 'varchar', length: 200 })
  productName!: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  subtotal?: string | null;

  @Column({ type: 'int' })
  orderId!: number;

  @ManyToOne(() => Order, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'int' })
  variantId!: number;

  @ManyToOne(() => Variant, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'variantId' })
  variant?: Variant;

  @Column({ type: 'int' })
  orderSellerId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'orderSellerId' })
  orderSeller?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
