import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('operators')
export class Operator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;
}
