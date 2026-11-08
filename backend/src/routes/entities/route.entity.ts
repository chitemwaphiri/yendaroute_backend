import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Stop } from '../../stops/entities/stop.entity';
import { RouteStop } from './route-stop.entity';
import { Fare } from '../../fares/entities/fare.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  
  @ManyToOne(() => Stop, { eager: true }) @JoinColumn({ name: 'originStopId' })
  originStop: Stop;
  @Column() originStopId: number;

  @ManyToOne(() => Stop, { eager: true }) @JoinColumn({ name: 'destinationStopId' })
  destinationStop: Stop;
  @Column() destinationStopId: number;

  // NEW FIELDS FOR FRONTEND
  @Column({ nullable: true }) companyName: string;
  @Column({ nullable: true }) pickupLocation: string;
  @Column({ default: false }) featured: boolean;

  @Column({ type: 'jsonb', nullable: true }) geometry: any;
  @Column('float', { nullable: true }) distance: number;

  @OneToMany(() => RouteStop, (rs) => rs.route, { cascade: true })
  routeStops: RouteStop[];

  @OneToMany(() => Fare, (fare) => fare.route)
  fares: Fare[];

  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}