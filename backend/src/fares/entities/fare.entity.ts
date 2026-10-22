
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('fares')
export class Fare {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  routeId: number;

  @Column({ type: 'int' })
  originStopId: number;

  @Column({ type: 'int' })
  destinationStopId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'MWK' })
  currency: string;
}
