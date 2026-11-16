import { PaymentMethod } from '@/entities/payment-method.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'payment_method_id', type: 'int', unique: true })
  paymentMethodId!: number;

  @OneToOne(() => PaymentMethod, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'paymentMethodId',
    referencedColumnName: 'id',
  })
  paymentMethod?: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brand?: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  last4?: string | null;

  @Column({ name: 'exp_month', type: 'smallint', nullable: true })
  expMonth?: number | null;

  @Column({ name: 'exp_year', type: 'smallint', nullable: true })
  expYear?: number | null;
}
