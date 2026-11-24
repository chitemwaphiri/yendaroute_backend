import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stop } from './entities/stop.entity';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopDto } from './dto/query-stop.dto';
import { paginated } from '../common/pagination';

@Injectable()
export class StopsService {
  constructor(@InjectRepository(Stop) private stops: Repository<Stop>) {}

  async create(dto: CreateStopDto) {
    return this.stops.save(this.stops.create(dto));
  }

  async findAll(q: QueryStopDto) {
    const qb = this.stops.createQueryBuilder('s').where('s.isActive = true');
    if (q.name) qb.andWhere('s.name ILIKE :n', { n: `%${q.name}%` });
    qb.skip((q.page - 1) * q.limit).take(q.limit).orderBy('s.name', 'ASC');
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, q.page, q.limit, total);
  }

  async search(name: string, limit = 8) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 8));
    return this.stops
      .createQueryBuilder('stop')
      .where('stop.isActive = true')
      .andWhere('stop.name ILIKE :name', { name: `%${name}%` })
      .orderBy('stop.name', 'ASC')
      .limit(safeLimit)
      .getMany();
  }
// this is my comment 
  async findOne(id: number) {
    const stop = await this.stops.findOne({ where: { id } });
    if (!stop) throw new NotFoundException('Stop not found');
    return stop;
  }

  async nearby(lat: number, lng: number, radius = 1000) {
    return this.stops
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .andWhere(
        `ST_DWithin(geography(ST_MakePoint(s.longitude, s.latitude)), geography(ST_MakePoint(:lng, :lat)), :radius)`,
        { lng, lat, radius },
      )
      .orderBy(
        `ST_Distance(geography(ST_MakePoint(s.longitude, s.latitude)), geography(ST_MakePoint(:lng, :lat)))`,
        'ASC',
      )
      .setParameters({ lng, lat })
      .limit(20)
      .getMany();
  }

  async update(id: number, dto: UpdateStopDto) {
    await this.findOne(id);
    await this.stops.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const stop = await this.findOne(id);
    await this.stops.remove(stop);
    return undefined;
  }
}