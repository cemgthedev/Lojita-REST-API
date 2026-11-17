import { Product } from '@/entities/product.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class ProductRating {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  average!: string;

  @Column({ type: 'int' })
  count!: number;

  @Column({ type: 'int', nullable: true })
  fiveStarCount?: number | null;

  @Column({ type: 'int', nullable: true })
  fourStarCount?: number | null;

  @Column({ type: 'int', nullable: true })
  threeStarCount?: number | null;

  @Column({ type: 'int', nullable: true })
  twoStarCount?: number | null;

  @Column({ type: 'int', nullable: true })
  oneStarCount?: number | null;

  @Column({ type: 'int' })
  productId!: number;

  @OneToOne(() => Product, { onDelete: 'RESTRICT' })
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
