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
  @Column({ type: 'varchar', nullable: true }) companyName: string | null;
  @Column({ type: 'varchar', nullable: true }) pickupLocation: string | null;
  @Column({ type: 'varchar', nullable: true }) dropOffLocation: string | null;
  @Column({ type: 'varchar', nullable: true }) roadName: string | null;
  @Column({ type: 'varchar', nullable: true }) duration: string | null;
  @Column({ default: 0 }) transfers: number;
  @Column({ type: 'simple-array', nullable: true }) departureTimes: string[] | null;
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