import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity';

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
  departureTime: string; // e.g., "08:30:00"

  @Column('varchar', { array: true })
  daysOfWeek: string[]; // e.g., ["MON", "TUE", "WED"]

  @Column('int')
  seatCapacity: number;

  @Column({ nullable: true })
  vehicleInfo?: string;

  @Column({ default: true })
  isActive: boolean;
}