import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { BookingSeat } from './booking-seat.entity';
import { decimalToNumber } from '../../common/decimal.transformer';

export enum BookingStatus {
  DRAFT = 'draft', // seats held, waiting for passenger details
  REVIEWED = 'reviewed', // details saved, ready to pay
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired', // the hold ran out
}

@Entity('bookings')
@Index(['userId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class Booking {
  @PrimaryGeneratedColumn() id: number;

  @Column({ unique: true }) reference: string;

  @ManyToOne(() => User, { eager: true }) @JoinColumn({ name: 'userId' })
  user: User;
  @Column() userId: number;

  @ManyToOne(() => Schedule, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;
  @Column() scheduleId: number;

  @Column({ type: 'date' }) travelDate: string;

  @OneToMany(() => BookingSeat, (s) => s.booking, { cascade: true, eager: true })
  seats: BookingSeat[];

  // Old column from before multi-seat bookings. No longer used.
  // Delete this line once the shared test data has been cleared.
  @Column({ type: 'varchar', nullable: true }) seatNumber: string | null;

  @ManyToOne(() => Stop, { eager: true }) @JoinColumn({ name: 'originStopId' })
  originStop: Stop;
  @Column() originStopId: number;

  @ManyToOne(() => Stop, { eager: true }) @JoinColumn({ name: 'destinationStopId' })
  destinationStop: Stop;
  @Column() destinationStopId: number;

  // Total price for all seats, worked out by the server
  @Column('decimal', { precision: 10, scale: 2, transformer: decimalToNumber })
  fare: number;

  @Column({ default: 'MWK' }) currency: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  @Column({ type: 'timestamptz', nullable: true }) holdExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true }) passengerName: string | null;
  @Column({ type: 'varchar', nullable: true }) passengerEmail: string | null;
  @Column({ type: 'varchar', nullable: true }) phoneNumber: string | null;
  @Column({ type: 'varchar', nullable: true }) identificationNumber: string | null;

  @Column({ type: 'varchar', nullable: true }) idempotencyKey: string | null;

  @CreateDateColumn() createdAt: Date;
}