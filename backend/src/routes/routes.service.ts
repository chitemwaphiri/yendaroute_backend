import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { Stop } from '../stops/entities/stop.entity';
import { Fare } from '../fares/entities/fare.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(RouteStop) private routeStops: Repository<RouteStop>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
  ) {}

  async create(dto: CreateRouteDto, user: any) {
    const originStop = await this.stops.findOne({ where: { id: dto.originStopId } });
    if (!originStop) throw new NotFoundException('Origin stop not found');

    const route = this.routes.create({
      name: dto.name,
      originStopId: dto.originStopId,
      destinationStopId: dto.destinationStopId,
      geometry: dto.geometry,
      distance: dto.distance,
    });
    await this.routes.save(route);

    const sequence = [
      { stopId: dto.originStopId, seq: 1 },
      ...(dto.intermediateStopIds || []).map((id, index) => ({ stopId: id, seq: index + 2 })),
      { stopId: dto.destinationStopId, seq: (dto.intermediateStopIds?.length || 0) + 2 }
    ];

    const routeStops = sequence.map(item => this.routeStops.create({
      routeId: route.id,
      stopId: item.stopId,
      sequence: item.seq
    }));
    await this.routeStops.save(routeStops);

    return this.findOne(route.id);
  }

  async findAll(originStopId?: number, destinationStopId?: number) {
    const qb = this.routes.createQueryBuilder('route')
      .leftJoinAndSelect('route.routeStops', 'routeStop')
      .leftJoinAndSelect('routeStop.stop', 'stop')
      .where('route.isActive = true');

    if (originStopId) qb.andWhere('route.originStopId = :originStopId', { originStopId });
    if (destinationStopId) qb.andWhere('route.destinationStopId = :destinationStopId', { destinationStopId });

    const routes = await qb.getMany();
    const formattedRoutes = [];
    for (const route of routes) {
      formattedRoutes.push(await this.formatRouteResponse(route));
    }
    return formattedRoutes;
  }

  async findOne(id: number) {
    const route = await this.routes.findOne({ 
      where: { id },
      relations: { routeStops: { stop: true } }
    });
    if (!route) throw new NotFoundException('Route not found');
    return this.formatRouteResponse(route);
  }

  private async formatRouteResponse(route: Route) {
    const sortedStops = route.routeStops.sort((a, b) => a.sequence - b.sequence);
    const routeStopsFormatted = sortedStops.map((rs, index) => {
      if (index === 0) return { "origin stop": { "name": rs.stop.name } };
      if (index === sortedStops.length - 1) return { "destination stop": { "name": rs.stop.name } };
      return { "in between stop": { "name": rs.stop.name } };
    });

    const rawFares = await this.fares.find({ 
      where: { routeId: route.id },
      relations: { originStop: true, destinationStop: true } 
    });

    const faresFormatted = rawFares.map(fare => {
      const routeLabel = `${fare.originStop.name.toLowerCase()} to ${fare.destinationStop.name.toLowerCase()}`;
      return { "amount": fare.amount, [routeLabel]: fare.currency };
    });

    return {
      id: route.id,
      name: route.name,
      originStop: { id: route.originStop.id, name: route.originStop.name },
      destinationStop: { id: route.destinationStop.id, name: route.destinationStop.name },
      geometry: route.geometry,
      distance: route.distance,
      routeStops: routeStopsFormatted,
      fares: faresFormatted
    };
  }

  async update(id: number, dto: UpdateRouteDto, user: any) {
    await this.findOne(id);
    await this.routes.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number, user: any) {
    // Fetch the raw entity before removing, so TypeORM doesn't get confused by the formatted response
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    
    await this.routes.remove(route);
    return { deleted: true, id };
  }
}