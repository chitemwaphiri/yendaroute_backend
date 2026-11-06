import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('transport_types')
export class TransportType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  // --- Added: vehicle details ---
  // Nullable at DB level so existing rows don't break synchronize/migrations.
  // The create DTO still requires them for all new records.
  @Column({ type: 'varchar', unique: true, nullable: true })
  plateNumber?: string;

  @Column({ type: 'int', nullable: true })
  seatingCapacity?: number;

  // --- Added: driver details ---
  @Column({ type: 'varchar', nullable: true })
  driverName?: string;

  @Column({ type: 'varchar', nullable: true })
  driverPhone?: string;

  @Column({ type: 'varchar', nullable: true })
  driverLicenseNumber?: string;
}