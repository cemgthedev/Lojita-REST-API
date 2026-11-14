import { Order } from '@/entities/order.entity';
import { Store } from '@/entities/store.entity';
import { ORDER_STATUS } from '@/modules/orders/enums/order-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('order_sellers')
@Index(['orderId'])
@Index(['storeId'])
export class OrderSeller {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ORDER_STATUS,
    default: ORDER_STATUS.PENDING,
  })
  status!: ORDER_STATUS;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  subtotal!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  total!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  shippingTotal!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountTotal!: string;

  @Column({ type: 'int' })
  storeId!: number;

  @ManyToOne(() => Store, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Store;

  @Column({ type: 'int' })
  orderId!: number;

  @ManyToOne(() => Order, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order?: Order;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
