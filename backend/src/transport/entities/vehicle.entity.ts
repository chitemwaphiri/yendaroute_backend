import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('vehicles')
@Index(['plateNumber'], { unique: true })
export class Vehicle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', nullable: true }) name: string | null;
  @Column() plateNumber: string;
  @Column() vehicleType: string;
  @Column('int') capacity: number;
  get seatCapacity(): number { return this.capacity; }
  get registrationNumber(): string { return this.plateNumber; }
  @Column({ type: 'varchar', nullable: true }) description: string | null;
  @ManyToOne(() => User, { eager: true, nullable: true }) @JoinColumn({ name: 'driverId' })
  driver: User | null;
  @Column({ nullable: true }) driverId: number | null;
  @Column({ default: true }) isActive: boolean;
}