import { STATUS } from '@/common/enums/status.enum';
import { Store } from '@/entities/store.entity';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
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

@Entity('coupons')
@Index('UQ_coupon_code', ['code'], { unique: true })
@Index(['storeId', 'status'])
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: COUPON_SCOPE_TYPE,
  })
  scopeType!: COUPON_SCOPE_TYPE;

  @Column({
    type: 'enum',
    enum: COUPON_TYPE,
  })
  type!: COUPON_TYPE;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  value!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minPurchaseAmount!: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  usageLimit?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  usageLimitPerUser?: number | null;

  @Column({
    type: 'enum',
    enum: STATUS,
    default: STATUS.ACTIVE,
  })
  status!: STATUS;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @Column({ type: 'int', nullable: true })
  storeId?: number | null;

  @ManyToOne(() => Store, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Store;

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
