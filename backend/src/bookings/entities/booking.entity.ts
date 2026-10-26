import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Stop } from '../../stops/entities/stop.entity';

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity('bookings')
// Ensure a single booking reference is unique
@Index(['reference'], { unique: true })
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reference: string; // e.g., "BKG-A1B2C3"

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Schedule, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;

  @Column()
  scheduleId: number;

  @Column({ type: 'date' })
  travelDate: string;

  @ManyToOne(() => Stop, { eager: true })
  @JoinColumn({ name: 'originStopId' })
  originStop: Stop;

  @Column()
  originStopId: number;

  @ManyToOne(() => Stop, { eager: true })
  @JoinColumn({ name: 'destinationStopId' })
  destinationStop: Stop;

  @Column()
  destinationStopId: number;

  @Column('int')
  seats: number;

  @Column('decimal', { precision: 10, scale: 2 })
  estimatedFare: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @CreateDateColumn()
  createdAt: Date;
}