import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn() id: number;
  @Column() plateNumber: string;
  @Column() vehicleType: string;
  @Column('int') capacity: number;
  @Column({ nullable: true }) description: string;
  @ManyToOne(() => User, { eager: true, nullable: true }) @JoinColumn({ name: 'driverId' })
  driver: User;
  @Column({ nullable: true }) driverId: number;
  @Column({ default: true }) isActive: boolean;
}