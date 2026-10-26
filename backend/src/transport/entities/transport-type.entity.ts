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
}