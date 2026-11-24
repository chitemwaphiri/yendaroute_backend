import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Route } from './route.entity';
import { Stop } from '../../stops/entities/stop.entity';

@Entity('route_stops')
@Index(['routeId', 'sequence'], { unique: true })
export class RouteStop {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Route, (r) => r.routeStops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;
  @Column() routeId: number;

  @ManyToOne(() => Stop, { eager: true })
  @JoinColumn({ name: 'stopId' })
  stop: Stop;
  @Column() stopId: number;

  @Column('int') sequence: number;
}