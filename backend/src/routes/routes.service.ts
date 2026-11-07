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

<<<<<<< HEAD
    if (originStopId) qb.andWhere('route.originStopId = :originStopId', { originStopId });
    if (destinationStopId) qb.andWhere('route.destinationStopId = :destinationStopId', { destinationStopId });

    const routes = await qb.getMany();
    const formattedRoutes = [];
    for (const route of routes) {
      formattedRoutes.push(await this.formatRouteResponse(route));
    }
    return formattedRoutes;
=======
           // The list returns summaries. Full details come from GET /routes/:id.
       const [data, total] = await this.routes.findAndCount({
         where,
         skip: (page - 1) * limit,
         take: limit,
         order: { createdAt: 'DESC' },
       });

       return { data, total, page, limit };

  }

  async count() {
    return { count: await this.routes.count() };
>>>>>>> 5d17364a22bba3771f26b2597ca089703f996fe9
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
<<<<<<< HEAD
=======
    const fares = await this.fares.find({ where: { routeId: id } });
    return this.buildOrderedStops(records, fares);
  }
    // Nearest stop to the driver + the next stops ahead on the route
  async findUpcomingStops(
    id: number,
    lat: number,
    lng: number,
    limit = 3,
    direction: 'forward' | 'reverse' = 'forward',
  ) {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }
    if (direction !== 'forward' && direction !== 'reverse') {
      throw new BadRequestException("direction must be 'forward' or 'reverse'");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      throw new BadRequestException('limit must be a whole number from 1 to 10');
    }

    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');

    const records = await this.routeStops.find({
      where: { routeId: id },
      order: { sequence: 'ASC' },
    });
    const ordered = (direction === 'reverse' ? [...records].reverse() : records)
      .filter((record) => record.stop);
    if (!ordered.length) throw new NotFoundException('Route has no stops');

    const stops = ordered.map((record) => ({
      id: record.stopId,
      name: record.stop.name,
      latitude: record.stop.latitude,
      longitude: record.stop.longitude,
      sequence: record.sequence,
      distanceMeters: Math.round(
        this.calculateDistanceKm([
          [lng, lat],
          [Number(record.stop.longitude), Number(record.stop.latitude)],
        ]) * 1000,
      ),
    }));

    let nearest = 0;
    stops.forEach((stop, i) => {
      if (stop.distanceMeters < stops[nearest].distanceMeters) nearest = i;
    });

    return {
      routeId: id,
      direction,
      nearestStop: stops[nearest],
      upcomingStops: stops.slice(nearest + 1, nearest + 1 + limit),
    };
  }
>>>>>>> 5d17364a22bba3771f26b2597ca089703f996fe9

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
<<<<<<< HEAD
=======

  private async enrich(route: Route) {
    const records = await this.routeStops.find({
      where: { routeId: route.id },
      order: { sequence: 'ASC' },
    });
    const fares = await this.fares.find({ where: { routeId: route.id } });
    const stops = this.buildOrderedStops(records, fares);
    const coordinates: [number, number][] = stops
      .filter((item) => item.stop)
      .map(
        (item) =>
          [
            Number(item.stop.longitude),
            Number(item.stop.latitude),
          ] as [number, number],
      );
    const geometry: GeoJsonLineString = {
      type: 'LineString',
      coordinates,
    };
    const distanceKm = this.calculateDistanceKm(coordinates);

             return {
      ...route,
      stops,
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: { routeId: route.id, name: route.name },
          },
          ...stops
            .filter((item) => item.stop)
            .map((item) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [
                  Number(item.stop.longitude),
                  Number(item.stop.latitude),
                ],
              },
              properties: {
                stopId: item.stop.id,
                name: item.stop.name,
                sequence: item.sequence,
              },
            })),
        ],
      },
      distanceKm: Number(distanceKm.toFixed(2)),
      distanceUnit: 'km',
      fares,
    };
  
  }

  private buildOrderedStops(records: RouteStop[], fares: Fare[]) {
    return records.map((record, index) => {
      const previous = records[index - 1];
      const fareFromPrevious = previous
        ? fares.find(
            (fare) =>
              fare.originStopId === previous.stopId &&
              fare.destinationStopId === record.stopId,
          ) ?? null
        : null;
      return {
        sequence: record.sequence,
        stop: record.stop,
        fareFromPrevious,
      };
    });
  }

  /** Sum straight-line distances between consecutive stop coordinates (Haversine). */
  private calculateDistanceKm(coordinates: [number, number][]) {
    const earthRadiusKm = 6371.0088;
    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1];
      const [lon2, lat2] = coordinates[i];
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;
      total +=
        2 *
        earthRadiusKm *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return total;
  }
>>>>>>> 5d17364a22bba3771f26b2597ca089703f996fe9
}