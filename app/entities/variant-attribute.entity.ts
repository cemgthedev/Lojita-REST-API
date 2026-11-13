import { AttributeValue } from '@/entities/attribute-value.entity';
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
@Unique(['variantId', 'attributeValueId'])
export class VariantAttribute {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  variantId!: number;

  @ManyToOne(() => Variant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variantId', referencedColumnName: 'id' })
  variant?: Variant;

  @Column({ type: 'int' })
  attributeValueId!: number;

  @ManyToOne(() => AttributeValue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attributeValueId', referencedColumnName: 'id' })
  attributeValue?: AttributeValue;

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
