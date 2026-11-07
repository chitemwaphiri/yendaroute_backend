import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { Route } from '../routes/entities/route.entity';
import { Stop } from '../stops/entities/stop.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
  ) {}

  async create(dto: CreateScheduleDto) {
    const route = await this.routes.findOne({ where: { id: dto.routeId } });
    if (!route) throw new NotFoundException('Route not found');
    return this.schedules.save(this.schedules.create(dto));
  }

  async findAll(routeId?: number, originName?: string, destName?: string) {
    let finalRouteId = routeId;
    if (originName && destName) {
      const originStop = await this.stops.createQueryBuilder('s').where('s.name ILIKE :name', { name: `%${originName}%` }).getOne();
      const destStop = await this.stops.createQueryBuilder('s').where('s.name ILIKE :name', { name: `%${destName}%` }).getOne();
      if (originStop && destStop) {
        const route = await this.routes.findOne({ where: { originStopId: originStop.id, destinationStopId: destStop.id } });
        if (route) finalRouteId = route.id;
      }
    }
    const where: any = { isActive: true };
    if (finalRouteId) where.routeId = finalRouteId;

    return this.schedules.find({ 
      where, 
      relations: { vehicle: { driver: true }, route: { routeStops: { stop: true } } },
      order: { departureTime: 'ASC' } 
    });
  }

  async findOne(id: number) {
    const schedule = await this.schedules.findOne({ 
      where: { id },
      relations: { vehicle: { driver: true }, route: { routeStops: { stop: true } } }
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async update(id: number, dto: UpdateScheduleDto) {
    await this.findOne(id);
    await this.schedules.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const schedule = await this.findOne(id);
    await this.schedules.remove(schedule);
    return { deleted: true, id };
  }
}