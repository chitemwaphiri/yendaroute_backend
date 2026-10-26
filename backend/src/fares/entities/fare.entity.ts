import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity';

@Entity('fares')
export class Fare {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Route, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column()
  routeId: number;

  // Note: Keeping origin/destination here as well allows different fares 
  // for different segments of the same route
  @Column()
  originStopId: number;

  @Column()
  destinationStopId: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'MWK' })
  currency: string;
}
