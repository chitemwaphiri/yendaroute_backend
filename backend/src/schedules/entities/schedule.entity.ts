import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Route } from '../../routes/entities/route.entity';
import { Vehicle } from '../../transport/entities/vehicle.entity';
import { Stop } from '../../stops/entities/stop.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Route, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;
  @Column() routeId: number;

  @ManyToOne(() => Vehicle, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;
  @Column() vehicleId: number;

  @ManyToOne(() => Stop, { eager: true })
  @JoinColumn({ name: 'departureStopId' })
  departureStop: Stop;
  @Column() departureStopId: number;

  @Column({ type: 'time' }) departureTime: string;
  @Column({ type: 'time', nullable: true }) arrivalAt: string | null;
  @Column('decimal', { precision: 10, scale: 2, nullable: true }) fare: number | null;
  @Column('varchar', { array: true }) daysOfWeek: string[];
  
  @Column({ default: true }) isActive: boolean;
}