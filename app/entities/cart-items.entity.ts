import { Cart } from '@/entities/cart.entity';
import { Variant } from '@/entities/variant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Unique(['variantId'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int' })
  cartId!: number;

  @ManyToOne(() => Cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId', referencedColumnName: 'id' })
  cart?: Cart;

  @Column({ type: 'int' })
  variantId!: number;

  @ManyToOne(() => Variant, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variantId', referencedColumnName: 'id' })
  variant?: Variant;

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
