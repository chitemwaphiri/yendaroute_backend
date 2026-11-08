import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';

@Entity('fares')
export class Fare {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'routeId' })
  route: Route;
  @Column() routeId: number;

  @ManyToOne(() => Stop, { eager: true }) @JoinColumn({ name: 'originStopId' })
  originStop: Stop;
  @Column() originStopId: number;

  @ManyToOne(() => Stop, { eager: true }) @JoinColumn({ name: 'destinationStopId' })
  destinationStop: Stop;
  @Column() destinationStopId: number;

  @Column('decimal', { precision: 10, scale: 2 }) amount: number;
  
  @Column({ default: 'MWK' }) currency: string;
}
