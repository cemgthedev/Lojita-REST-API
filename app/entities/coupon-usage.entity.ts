import { Coupon } from '@/entities/coupon.entity';
import { Order } from '@/entities/order.entity';
import { User } from '@/entities/user.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CouponUsage {
  @PrimaryColumn({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user?: User;

  @PrimaryColumn({ type: 'int' })
  couponId!: number;

  @ManyToOne(() => Coupon, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'couponId', referencedColumnName: 'id' })
  coupon?: Coupon;

  @PrimaryColumn({ type: 'int' })
  orderId!: number;

  @ManyToOne(() => Order, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order?: Order;

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
