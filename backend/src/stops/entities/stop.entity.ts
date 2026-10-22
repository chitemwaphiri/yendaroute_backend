import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RouteStop } from '../../routes/entities/route-stop.entity';

@Entity('stops')
export class Stop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ nullable: true })
  city: string;

  @OneToMany(() => RouteStop, (routeStop) => routeStop.stop)
  routeStops: RouteStop[];
}