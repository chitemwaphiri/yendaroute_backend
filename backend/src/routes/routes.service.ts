import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Fare } from '../fares/entities/fare.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRouteDto } from './dto/query-route.dto';

type GeoJsonLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStops: Repository<RouteStop>,
    @InjectRepository(Stop) private readonly stops: Repository<Stop>,
    @InjectRepository(Fare) private readonly fares: Repository<Fare>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRouteDto) {
    if (dto.originStopId === dto.destinationStopId) {
      throw new BadRequestException('Origin and destination must differ');
    }

    const [origin, destination] = await Promise.all([
      this.stops.findOne({ where: { id: dto.originStopId } }),
      this.stops.findOne({ where: { id: dto.destinationStopId } }),
    ]);
    if (!origin || !destination) {
      throw new BadRequestException('Origin and destination stops must exist');
    }

    const route = await this.dataSource.transaction(async (manager) => {
      const routeRepo = manager.getRepository(Route);
      const stopRepo = manager.getRepository(RouteStop);
      const savedRoute = await routeRepo.save(
        routeRepo.create({ ...dto, isActive: true }),
      );
      await stopRepo.save([
        stopRepo.create({
          routeId: savedRoute.id,
          stopId: dto.originStopId,
          sequence: 1,
        }),
        stopRepo.create({
          routeId: savedRoute.id,
          stopId: dto.destinationStopId,
          sequence: 2,
        }),
      ]);
      return savedRoute;
    });

    return this.findOne(route.id);
  }

  async findAll(q: QueryRouteDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const where: any = {};
    if (q.transportTypeId) where.transportTypeId = q.transportTypeId;
    if (q.isActive !== undefined) where.isActive = q.isActive;

    const [routes, total] = await this.routes.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const data = await Promise.all(routes.map((route) => this.enrich(route)));
    return { data, total, count: total, page, limit };
  }

  async count() {
    return { count: await this.routes.count() };
  }

  async findOne(id: number) {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    return this.enrich(route);
  }

  async findStops(id: number) {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    const records = await this.routeStops.find({
      where: { routeId: id },
      order: { sequence: 'ASC' },
    });
    const fares = await this.fares.find({ where: { routeId: id } });
    return this.buildOrderedStops(records, fares);
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
    const originStop = await this.stops
      .createQueryBuilder('s')
      .where('s.name ILIKE :name', { name: `%${from}%` })
      .andWhere('s.isActive = true')
      .getOne();

    if (!originStop) throw new NotFoundException(`Origin '${from}' not found`);

    const destStop = await this.stops
      .createQueryBuilder('s')
      .where('s.name ILIKE :name', { name: `%${to}%` })
      .andWhere('s.isActive = true')
      .getOne();

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

  async update(id: number, dto: UpdateRouteDto, nearbyStopId?: number) {
    const existing = await this.routes.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Route not found');

    if (
      nearbyStopId !== undefined &&
      (!Number.isInteger(nearbyStopId) || nearbyStopId < 1)
    ) {
      throw new BadRequestException('nearbyStopId must be a positive integer');
    }

    const requestedIntermediates = dto.intermediateStopIds ?? [];
    const additions = [
      ...requestedIntermediates,
      ...(nearbyStopId === undefined ? [] : [nearbyStopId]),
    ];

    if (additions.length > 0) {
      const uniqueAdditions = [...new Set(additions)];
      const foundStops = await this.stops.findBy({ id: In(uniqueAdditions) });
      if (foundStops.length !== uniqueAdditions.length) {
        throw new BadRequestException('One or more intermediate stops do not exist');
      }
      if (
        uniqueAdditions.includes(existing.originStopId) ||
        uniqueAdditions.includes(existing.destinationStopId)
      ) {
        throw new BadRequestException(
          'Origin and destination cannot be added as intermediate stops',
        );
      }

      await this.dataSource.transaction(async (manager) => {
        const routeRepo = manager.getRepository(Route);
        const routeStopRepo = manager.getRepository(RouteStop);
        const currentStops = await routeStopRepo.find({
          where: { routeId: id },
          order: { sequence: 'ASC' },
        });
        const currentIntermediateIds = currentStops
          .filter(
            (item) =>
              item.stopId !== existing.originStopId &&
              item.stopId !== existing.destinationStopId,
          )
          .map((item) => item.stopId);
        const allIntermediateIds = [
          ...currentIntermediateIds,
          ...uniqueAdditions.filter((stopId) => !currentIntermediateIds.includes(stopId)),
        ];

        const updatedRoute = { ...existing, ...dto };
        delete (updatedRoute as any).intermediateStopIds;
        await routeRepo.save(updatedRoute);

        await routeStopRepo.delete({ routeId: id });
        const orderedIds = [
          existing.originStopId,
          ...allIntermediateIds,
          existing.destinationStopId,
        ];
        await routeStopRepo.save(
          orderedIds.map((stopId, index) =>
            routeStopRepo.create({
              routeId: id,
              stopId,
              sequence: index + 1,
            }),
          ),
        );
      });
    } else {
      const routeFields = { ...dto };
      delete routeFields.intermediateStopIds;
      await this.routes.update(id, routeFields);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    await this.routes.remove(route);
    return { deleted: true, id };
  }

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
      geometry,
      geojson: {
        type: 'Feature',
        geometry,
        properties: { routeId: route.id, name: route.name, distanceKm },
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
        id: record.stopId,
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
}