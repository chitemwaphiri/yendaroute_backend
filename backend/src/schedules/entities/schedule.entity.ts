import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Route, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column()
  routeId: number;

  @Column({ type: 'time' })
  departureTime: string;

  @Column('varchar', { array: true })
  daysOfWeek: string[];

  @Column('int')
  seatCapacity: number;

  @Column({ nullable: true })
  vehicleInfo?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driverId' })
  driver?: User;

  @Column({ type: 'int', nullable: true })
  driverId?: number;

  @Column({ type: 'int', default: 50 })
  totalSeats: number;

  @Column({ default: true })
  isActive: boolean;
}