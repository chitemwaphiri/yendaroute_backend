import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRouteDto } from './dto/query-route.dto';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(RouteStop) private routeStops: Repository<RouteStop>,
  ) {}

  async create(dto: CreateRouteDto) {
    if (dto.originStopId === dto.destinationStopId) {
      throw new BadRequestException('Origin and destination must differ');
    }

    const route = await this.routes.save(
      this.routes.create({ ...dto, isActive: true }),
    );

    await this.routeStops.save([
      this.routeStops.create({
        routeId: route.id,
        stopId: dto.originStopId,
        sequence: 1,
      }),
      this.routeStops.create({
        routeId: route.id,
        stopId: dto.destinationStopId,
        sequence: 2,
      }),
    ]);

    return this.findOne(route.id);
  }

  async findAll(q: QueryRouteDto) {
    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const where: any = {};
    if (q.transportTypeId) where.transportTypeId = q.transportTypeId;
    if (q.isActive !== undefined) where.isActive = q.isActive;

    const [data, total] = await this.routes.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async findStops(id: number) {
    await this.findOne(id);
    return this.routeStops.find({
      where: { routeId: id },
      order: { sequence: 'ASC' },
    });
  }

  // Routes between two stops by ID (direct only)
  async searchBetween(originStopId: number, destinationStopId: number) {
    return this.routes.find({
      where: { originStopId, destinationStopId, isActive: true },
    });
  }

  // By city name — resolve names to stops, then reuse searchBetween
  // (returns both the resolved stops and the routes)
  async searchByCity(from: string, to: string) {
    const originStop = await this.routes.manager
      .createQueryBuilder()
      .select('s')
      .from('stops', 's')
      .where('s.name ILIKE :name', { name: `%${from}%` })
      .andWhere('s.isActive = true')
      .getRawOne();

    if (!originStop) throw new NotFoundException(`Origin '${from}' not found`);

    const destStop = await this.routes.manager
      .createQueryBuilder()
      .select('s')
      .from('stops', 's')
      .where('s.name ILIKE :name', { name: `%${to}%` })
      .andWhere('s.isActive = true')
      .getRawOne();

    if (!destStop) throw new NotFoundException(`Destination '${to}' not found`);

    const routes = await this.searchBetween(originStop.id, destStop.id);
    return { originStop, destinationStop: destStop, availableRoutes: routes };
  }

  // Multi-leg connections: origin → transfer → destination
  async findConnections(originStopId: number, destinationStopId: number) {
    const firstLegs = await this.routes.find({
      where: { originStopId, isActive: true },
    });
    if (!firstLegs.length) return [];

    const secondLegs = await this.routes.find({
      where: { destinationStopId, isActive: true },
    });
    if (!secondLegs.length) return [];

    const connections: any[] = [];
    for (const leg1 of firstLegs) {
      for (const leg2 of secondLegs) {
        if (
          leg1.destinationStopId === leg2.originStopId &&
          leg1.id !== leg2.id
        ) {
          connections.push({
            leg1,
            transferStop: leg1.destinationStop,
            leg2,
          });
        }
      }
    }
    return connections;
  }

  async update(id: number, dto: UpdateRouteDto) {
    await this.findOne(id);
    await this.routes.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const route = await this.findOne(id);
    await this.routes.remove(route);
    return { deleted: true, id };
  }
}