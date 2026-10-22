import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RouteStop } from './route-stop.entity';
import { TransportType } from '../../transport-types/entities/transport-type.entity';
import { Stop } from '../../stops/entities/stop.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'origin_stop_id', nullable: true })
  originStopId: number;

  @ManyToOne(() => Stop, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'origin_stop_id' })
  originStop: Stop;

  @Column({ name: 'destination_stop_id', nullable: true })
  destinationStopId: number;

  @ManyToOne(() => Stop, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'destination_stop_id' })
  destinationStop: Stop;

  @Column({ name: 'transport_type_id', nullable: true })
  transportTypeId: number;

  @ManyToOne(() => TransportType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'transport_type_id' })
  transportType: TransportType;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RouteStop, (routeStop) => routeStop.route, { cascade: true })
  routeStops: RouteStop[];
}