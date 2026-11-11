import { Category } from '@/entities/category.entity';
import { Store } from '@/entities/store.entity';
import { Variant } from '@/entities/variant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description?: string;

  @Column({ type: 'int', nullable: true })
  storeId?: number;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Store;

  @Column({ type: 'int', nullable: true })
  categoryId?: number;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId', referencedColumnName: 'id' })
  category?: Category;

  @Column({ type: 'int', nullable: true })
  defaultVariantId?: number;

  @OneToMany(() => Variant, (variant) => variant.product)
  variants?: Variant[];

  @OneToOne(() => Variant, { nullable: true })
  @JoinColumn({ name: 'defaultVariantId', referencedColumnName: 'id' })
  defaultVariant?: Variant;

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
