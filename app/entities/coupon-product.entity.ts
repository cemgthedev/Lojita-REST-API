import { Coupon } from '@/entities/coupon.entity';
import { Product } from '@/entities/product.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CouponProduct {
  @PrimaryColumn({ type: 'int' })
  couponId!: number;

  @ManyToOne(() => Coupon, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'couponId', referencedColumnName: 'id' })
  coupon?: Coupon;

  @PrimaryColumn({ type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product?: Product;

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
