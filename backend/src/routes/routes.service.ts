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

    // Create the route
    const route = await this.routes.save(
      this.routes.create({ ...dto, isActive: true }),
    );

    // Seed the route_stops table (origin at sequence 1, destination at 2)
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