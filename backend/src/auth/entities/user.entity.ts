import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  PASSENGER = 'passenger',
  DRIVER = 'driver',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string | null;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PASSENGER })
  role: UserRole;

  @Column({ nullable: true })
  licenseId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
