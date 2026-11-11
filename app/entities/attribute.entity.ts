import { AttributeValue } from '@/entities/attribute-value.entity';
import { ATRIBUTE_TYPE } from '@/modules/attributes/enums/type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Attribute {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: ATRIBUTE_TYPE })
  type!: ATRIBUTE_TYPE;

  @OneToMany(() => AttributeValue, (attributeValue) => attributeValue.attribute)
  values?: AttributeValue[];

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
