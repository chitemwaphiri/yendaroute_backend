import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Route } from '../../routes/entities/route.entity';
import { Vehicle } from '../../transport/entities/vehicle.entity';
import { Operator } from '../../transport/entities/operator.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { decimalToNumber } from '../../common/decimal.transformer';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Route, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;
  @Column() routeId: number;

  @ManyToOne(() => Vehicle, { eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle | null;
  @Column({ nullable: true }) vehicleId: number | null;

  @ManyToOne(() => Operator, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: Operator | null;

  @ManyToOne(() => Stop, { eager: true, nullable: true })
  @JoinColumn({ name: 'departureStopId' })
  departureStop: Stop | null;
  @Column({ nullable: true }) departureStopId: number | null;

  @Column({ type: 'date', nullable: true }) serviceDate: string | null;
  @Column({ type: 'date', nullable: true }) arrivalDate: string | null;
  @Column({ type: 'time' }) departureTime: string;
  @Column({ type: 'time', nullable: true }) arrivalAt: string | null;
  @Column('decimal', { precision: 10, scale: 2, nullable: true, transformer: decimalToNumber }) fare: number | null;
  @Column({ type: 'varchar', default: 'MWK' }) currency: string;
  @Column({ type: 'int', nullable: true }) totalSeats: number | null;
  @Column({ type: 'int', nullable: true }) operatorId: number | null;
  @Column({ type: 'varchar', nullable: true }) originName: string | null;
  @Column({ type: 'varchar', nullable: true }) destinationName: string | null;
  @Column({ type: 'varchar', nullable: true }) operatorName: string | null;
  @Column({ type: 'varchar', nullable: true }) routeName: string | null;
  @Column({ type: 'varchar', nullable: true }) vehicleName: string | null;
  @Column({ type: 'varchar', nullable: true }) transportMode: string | null;
  @Column('varchar', { array: true }) daysOfWeek: string[];
  
  @Column({ default: true }) isActive: boolean;
}