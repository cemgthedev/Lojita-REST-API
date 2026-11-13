import { Store } from '@/entities/store.entity';
import { UserAddress } from '@/entities/user-address.entity';
import { Role } from '@/modules/users/enums/role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
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

  @Column({ type: 'number', nullable: true })
  storeId?: number;

  @OneToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Store;

  @OneToMany(() => UserAddress, (address) => address.user)
  addresses?: UserAddress[];

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
