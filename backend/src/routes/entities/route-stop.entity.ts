import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from './route.entity';
import { Stop } from '../../stops/entities/stop.entity';

@Entity('route_stops')
export class RouteStop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'route_id' })
  routeId: number;

  @ManyToOne(() => Route, (route) => route.routeStops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ name: 'stop_id' })
  stopId: number;

  @ManyToOne(() => Stop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stop_id' })
  stop: Stop;

  @Column({ type: 'int', default: 0 })
  sequence: number;
}