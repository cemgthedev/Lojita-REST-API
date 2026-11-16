import { Order } from '@/entities/order.entity';
import { PaymentMethod } from '@/entities/payment-method.entity';
import { PAYMENT_STATUS } from '@/modules/payments/enums/payment-status.enum';
import { PAYMENT_TYPE } from '@/modules/payments/types/payment.type';
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

@Entity('payments')
@Index('UQ_payment_provider_id', ['provider', 'providerPaymentId'], {
  unique: true,
})
@Index(['orderId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  provider!: string;

  @Column({
    type: 'varchar',
    length: 300,
  })
  providerPaymentId!: string;

  @Column({
    type: 'enum',
    enum: PAYMENT_TYPE,
  })
  methodType!: PAYMENT_TYPE;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount!: string;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: PAYMENT_STATUS,
    default: PAYMENT_STATUS.PENDING,
  })
  status!: PAYMENT_STATUS;

  @Column({ type: 'int' })
  paymentMethodId!: number;

  @ManyToOne(() => PaymentMethod, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'paymentMethodId',
    referencedColumnName: 'id',
  })
  paymentMethod?: PaymentMethod;

  @Column({ type: 'int' })
  orderId!: number;

  @ManyToOne(() => Order, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'orderId',
    referencedColumnName: 'id',
  })
  order?: Order;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  paidAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
