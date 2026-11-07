import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DRIVER = 'driver',
  PASSENGER = 'passenger',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() fullName: string;
  @Column({ unique: true }) email: string;
  @Column() phoneNumber: string;
  @Column({ select: false }) passwordHash: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.PASSENGER }) role: UserRole;
  @Column({ nullable: true }) licenseId: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}