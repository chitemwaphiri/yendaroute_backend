import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum RequestType {
  ADMIN = 'admin',
  DRIVER = 'driver',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('role_requests')
export class RoleRequest {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => User, { eager: true }) @JoinColumn({ name: 'userId' })
  user: User;
  @Column() userId: number;

  @Column({ type: 'enum', enum: RequestType }) type: RequestType;
  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING }) status: RequestStatus;

  @Column({ nullable: true }) reason?: string;
  @Column({ nullable: true }) licenseId?: string;

  @CreateDateColumn() createdAt: Date;
}