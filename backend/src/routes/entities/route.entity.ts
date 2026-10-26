import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Stop } from '../../stops/entities/stop.entity';
import { TransportType } from '../../transport/entities/transport-type.entity';
import { RouteStop } from './route-stop.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => Stop, { eager: true })
  @JoinColumn({ name: 'originStopId' })
  originStop: Stop;

  @Column()
  originStopId: number;

  @ManyToOne(() => Stop, { eager: true })
  @JoinColumn({ name: 'destinationStopId' })
  destinationStop: Stop;

  @Column()
  destinationStopId: number;

  @ManyToOne(() => TransportType, { eager: true })
  @JoinColumn({ name: 'transportTypeId' })
  transportType: TransportType;

  @Column()
  transportTypeId: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => RouteStop, (rs) => rs.route, { cascade: true })
  routeStops: RouteStop[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}