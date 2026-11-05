import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'trip_id' })
  tripId: number;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Schedule;

  @Column({ name: 'passenger_name', type: 'varchar', length: 255 })
  passengerName: string;

  @Column('int', { name: 'seat_numbers', array: true })
  seatNumbers: number[];

  @Column({ type: 'varchar', length: 20, default: 'CONFIRMED' })
  status: 'CONFIRMED' | 'CANCELLED';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}