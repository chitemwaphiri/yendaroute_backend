import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { Stop } from '../stops/entities/stop.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Schedule } from '../schedules/entities/schedule.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(RouteStop) private routeStops: Repository<RouteStop>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
  ) {}

  async create(dto: CreateRouteDto, user: any) {
    // 1. Combine all stop IDs in order
    const allStopIds = [
      dto.originStopId,
      ...(dto.intermediateStopIds || []),
      dto.destinationStopId
    ];

    // 2. Fetch stops to get coordinates for GeoJSON
    const stops = await this.stops.findBy({ id: In(allStopIds) });
    const orderedStops = allStopIds.map(id => stops.find(s => s.id === id)).filter(s => s !== undefined);

    if (orderedStops.length !== allStopIds.length) {
       throw new BadRequestException('One or more provided stop IDs do not exist');
    }

    // 3. Build GeoJSON automatically
    const coordinates = orderedStops.map(stop => [stop.longitude, stop.latitude]);
    const geometry = { type: 'LineString', coordinates };

    // 4. Save Route
    const route = this.routes.create({
      name: dto.name,
      originStopId: dto.originStopId,
      destinationStopId: dto.destinationStopId,
      geometry: geometry,
      distance: dto.distance,
      companyName: dto.companyName,
      pickupLocation: dto.pickupLocation,
      featured: dto.featured || false,
    });
    await this.routes.save(route);

    // 5. Save Route Stops sequence
    const routeStops = allStopIds.map((stopId, index) => this.routeStops.create({
      routeId: route.id,
      stopId,
      sequence: index + 1
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

  async search(originName: string, destName: string) {
    const qb = this.routes.createQueryBuilder('route')
      .leftJoinAndSelect('route.routeStops', 'routeStop')
      .leftJoinAndSelect('routeStop.stop', 'stop')
      .leftJoinAndSelect('route.originStop', 'origin')
      .leftJoinAndSelect('route.destinationStop', 'dest')
      .where('route.isActive = true')
      .andWhere('origin.name ILIKE :origin', { origin: `%${originName}%` })
      .andWhere('dest.name ILIKE :dest', { dest: `%${destName}%` });

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

  async findAllAdmin() {
    const routes = await this.routes.find({
      relations: { routeStops: { stop: true } }
    });
    const formattedRoutes = [];
    for (const route of routes) {
      formattedRoutes.push(await this.formatRouteResponse(route));
    }
    return formattedRoutes;
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

    const schedules = await this.schedules.find({ where: { routeId: route.id, isActive: true } });
    const departureTimes = schedules.map(s => s.departureTime);

    const fullRouteFare = rawFares.find(f => 
      f.originStopId === route.originStopId && f.destinationStopId === route.destinationStopId
    );

    return {
      id: route.id,
      name: route.name,
      originStop: route.originStop ? { id: route.originStop.id, name: route.originStop.name } : null,
      destinationStop: route.destinationStop ? { id: route.destinationStop.id, name: route.destinationStop.name } : null,
      geometry: route.geometry,
      distance: route.distance,
      companyName: route.companyName,
      pickupLocation: route.pickupLocation,
      featured: route.featured,
      active: route.isActive,
      fareEstimate: fullRouteFare ? fullRouteFare.amount : null,
      departureTimes: departureTimes,
      transfers: 0,
      routeStops: routeStopsFormatted,
      fares: faresFormatted
    };
  }

  async updateRouteStops(routeId: number, stopIds: number[]) {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');
    if (stopIds.length < 2) throw new BadRequestException('A route must have at least 2 stops');

    const stops = await this.stops.findBy({ id: In(stopIds) });
    const orderedStops = stopIds.map(id => stops.find(s => s.id === id)).filter(s => s !== undefined);

    const coordinates = orderedStops.map(stop => [stop.longitude, stop.latitude]);
    route.geometry = { type: 'LineString', coordinates };
    route.originStopId = stopIds[0];
    route.destinationStopId = stopIds[stopIds.length - 1];
    await this.routes.save(route);

    await this.routeStops.delete({ routeId });
    const newStops = stopIds.map((stopId, index) => this.routeStops.create({
      routeId, stopId, sequence: index + 1
    }));
    await this.routeStops.save(newStops);

    return this.findOne(routeId);
  }

  async updateRouteFare(routeId: number, amount: number) {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');

    let fare = await this.fares.findOne({ 
      where: { routeId, originStopId: route.originStopId, destinationStopId: route.destinationStopId } 
    });

    if (fare) {
      fare.amount = amount;
      return this.fares.save(fare);
    } else {
      fare = this.fares.create({
        routeId,
        originStopId: route.originStopId,
        destinationStopId: route.destinationStopId,
        amount,
        currency: 'MWK'
      });
      return this.fares.save(fare);
    }
  }

  async update(id: number, dto: UpdateRouteDto, user: any) {
    await this.findOne(id);
    await this.routes.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number, user: any) {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    
    const schedules = await this.schedules.find({ where: { routeId: id } });
    if (schedules.length > 0) {
      route.isActive = false;
      await this.routes.save(route);
      return { message: 'Route deactivated because it has active schedules', id };
    }

    await this.routes.remove(route);
    return { deleted: true, id };
  }
}