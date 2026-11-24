import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

// One row per seat. The unique rule stops the same seat being held twice
// for the same trip on the same date while the seat is still active.
@Entity('booking_seats')
@Index(['scheduleId', 'travelDate', 'seatNumber'], {
  unique: true,
  where: '"active" = true',
})
export class BookingSeat {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Booking, (b) => b.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
  @Column() bookingId: number;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;
  @Column() scheduleId: number;

  @Column({ type: 'date' }) travelDate: string;
  @Column({ type: 'integer' }) seatNumber: number;
  @Column({ default: true }) active: boolean;
}