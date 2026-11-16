import { Category } from '@/entities/category.entity';
import { Coupon } from '@/entities/coupon.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CouponCategory {
  @PrimaryColumn({ type: 'int' })
  couponId!: number;

  @ManyToOne(() => Coupon, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'couponId', referencedColumnName: 'id' })
  coupon?: Coupon;

  @PrimaryColumn({ type: 'int' })
  categoryId!: number;

  @ManyToOne(() => Category, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId', referencedColumnName: 'id' })
  category?: Category;

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
