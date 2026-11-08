import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('passenger_profiles')
export class PassengerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  identificationNumber: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}