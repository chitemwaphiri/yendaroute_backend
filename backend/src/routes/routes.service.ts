import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    @InjectRepository(RouteStop) private readonly routeStops: Repository<RouteStop>,
  ) {}

  async create(dto: CreateRouteDto) {
    const route = this.routes.create({
      name: dto.name,
      description: dto.description,
      originStopId: dto.originStopId,
      destinationStopId: dto.destinationStopId,
      transportTypeId: dto.transportTypeId,
      isActive: true,
    });
    const saved = await this.routes.save(route);

    if (dto.stops && dto.stops.length > 0) {
      const stops = dto.stops.map((s, index) =>
        this.routeStops.create({
          routeId: saved.id,
          stopId: s.stopId,
          sequence: s.sequence ?? index,
        }),
      );
      await this.routeStops.save(stops);
    }

    return this.findOne(saved.id);
  }

  findAll() {
    return this.routes.find({
      where: { isActive: true },
      relations: {
        routeStops: { stop: true },
        originStop: true,
        destinationStop: true,
        transportType: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const route = await this.routes.findOne({
      where: { id },
      relations: {
        routeStops: { stop: true },
        originStop: true,
        destinationStop: true,
        transportType: true,
      },
    });
    if (!route) throw new NotFoundException(`Route ${id} not found`);
    route.routeStops?.sort((a, b) => a.sequence - b.sequence);
    return route;
  }

  async update(id: number, dto: UpdateRouteDto) {
    await this.findOne(id);
    await this.routes.update(id, {
      name: dto.name,
      description: dto.description,
      originStopId: dto.originStopId,
      destinationStopId: dto.destinationStopId,
      transportTypeId: dto.transportTypeId,
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const route = await this.findOne(id);
    await this.routes.remove(route);
    return { deleted: true };
  }
}