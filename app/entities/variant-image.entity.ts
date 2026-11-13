import { Variant } from '@/entities/variant.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class VariantImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

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
