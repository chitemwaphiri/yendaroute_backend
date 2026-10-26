import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stop } from './entities/stop.entity';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopDto } from './dto/query-stop.dto';

@Injectable()
export class StopsService {
  constructor(@InjectRepository(Stop) private stops: Repository<Stop>) {}

  async create(dto: CreateStopDto) {
    const stop = this.stops.create(dto);
    return this.stops.save(stop);
  }

  async findAll(q: QueryStopDto) {
    const qb = this.stops.createQueryBuilder('s').where('s.isActive = true');

    if (q.name) qb.andWhere('s.name ILIKE :n', { n: `%${q.name}%` });

    qb.skip((q.page - 1) * q.limit)
      .take(q.limit)
      .orderBy('s.name', 'ASC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: q.page, limit: q.limit };
  }

  async findOne(id: number) {
    const stop = await this.stops.findOne({ where: { id } });
    if (!stop) throw new NotFoundException('Stop not found');
    return stop;
  }

  async nearby(lat: number, lng: number, radius = 1000) {
    // Uses PostGIS: `geography(ST_MakePoint(...))` distances are in metres
    return this.stops
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .andWhere(
        `ST_DWithin(
          geography(ST_MakePoint(s.longitude, s.latitude)),
          geography(ST_MakePoint(:lng, :lat)),
          :radius
        )`,
        { lng, lat, radius },
      )
      .orderBy(
        `ST_Distance(
          geography(ST_MakePoint(s.longitude, s.latitude)),
          geography(ST_MakePoint(:lng, :lat))
        )`,
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
    return { deleted: true, id };
  }
}