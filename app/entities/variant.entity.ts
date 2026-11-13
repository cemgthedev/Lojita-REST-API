import { STATUS } from '@/common/enums/status.enum';
import { Product } from '@/entities/product.entity';
import { VariantAttribute } from '@/entities/variant-attribute.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Variant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'int' })
  stock!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'enum', enum: STATUS, default: STATUS.ACTIVE })
  status!: STATUS;

  @Column({ type: 'int', nullable: true })
  productId?: number;

  @ManyToOne(() => Product, (product) => product.variants, { nullable: true })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product?: Product;

  @OneToMany(() => VariantAttribute, (variantAttribute) => variantAttribute.variant)
  variantAttributes?: VariantAttribute[];

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
