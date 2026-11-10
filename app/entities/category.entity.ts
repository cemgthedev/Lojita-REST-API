import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description?: string;

  /**
  TODO: somente se pedido, classe Product relação com category
  @OneToMany(() => Product, (product) => product.category)
  products?: Product[];
   */

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
