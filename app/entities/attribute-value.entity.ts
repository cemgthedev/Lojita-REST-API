import { Attribute } from '@/entities/attribute.entity';
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
export class AttributeValue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 100 })
  value!: string;

  @Column({ type: 'int' })
  attributeId!: number;

  @ManyToOne(() => Attribute, (attribute) => attribute.values)
  @JoinColumn({ name: 'attributeId', referencedColumnName: 'id' })
  attribute?: Attribute;

  @OneToMany(() => VariantAttribute, (variantAttribute) => variantAttribute.attributeValue)
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
