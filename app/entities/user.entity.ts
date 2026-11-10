import { Role } from '@/modules/users/enums/role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  whatsapp?: string;

  @Column({ type: 'varchar', length: 11 })
  cpf?: string;

  @Column({ type: 'varchar', length: 100 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  password!: string;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role!: Role;

  /**
  TODO: somente se pedido, classes Store, Address e Card e relações com users
  @Column({ type: 'number' })
  storeId!: number;

  @OneToOne(() => Store)
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Store;

  @OneToMany(() => Address, (address) => address.user)
  addresses?: Address[];

  @OneToMany(() => Card, (card) => card.user)
  cards?: Card[];
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
