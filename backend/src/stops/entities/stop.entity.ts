import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('stops')
export class Stop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;
}