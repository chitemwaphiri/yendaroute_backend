import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    // Resolve stop IDs from either integer IDs or string names (frontend sends names)
    const resolveStopId = async (
      stopNameOrId: string | number | undefined,
    ): Promise<number | null> => {
      if (
        stopNameOrId === undefined ||
        stopNameOrId === null ||
        stopNameOrId === ''
      )
        return null;

      // If it's already a number, use it directly
      if (typeof stopNameOrId === 'number') return stopNameOrId;

      const str = String(stopNameOrId).trim();
      if (!str) return null;

      // Try to find existing stop by exact name (case-insensitive)
      let stop = await this.stops.findOne({
        where: { name: str },
      });

      // If not found, try partial case-insensitive match
      if (!stop) {
        const existing = await this.stops
          .createQueryBuilder('s')
          .where('s.name ILIKE :name', { name: str })
          .getOne();
        if (existing) stop = existing;
      }

      // If still not found, auto-create the stop (frontend sends names that may not exist yet)
      if (!stop) {
        stop = await this.stops.save(
          this.stops.create({
            name: str,
            latitude: 0,
            longitude: 0,
            isActive: true,
          }),
        );
      }

      return stop.id;
    };

    const originStopId = await resolveStopId(dto.originStopId ?? dto.origin);
    const destinationStopId = await resolveStopId(
      dto.destinationStopId ?? dto.destination,
    );

    if (!originStopId || !destinationStopId) {
      throw new BadRequestException(
        'Origin and destination stops are required',
      );
    }

    // Resolve intermediate stops
    const intermediateStopIds: number[] = [];
    if (dto.intermediateStopIds?.length) {
      for (const id of dto.intermediateStopIds) intermediateStopIds.push(id);
    }
    if (dto.intermediateStops?.length) {
      for (const name of dto.intermediateStops) {
        const id = await resolveStopId(name);
        if (id) intermediateStopIds.push(id);
      }
    }

    const allStopIds = [
      originStopId,
      ...intermediateStopIds,
      destinationStopId,
    ];
    if (new Set(allStopIds).size !== allStopIds.length) {
      throw new BadRequestException('Route stops must be unique');
    }

    const stops = await this.stops.findBy({ id: In(allStopIds) });
    const orderedStops = allStopIds
      .map((id) => stops.find((s) => s.id === id))
      .filter((s) => s !== undefined);

    if (orderedStops.length !== allStopIds.length) {
      throw new BadRequestException(
        'One or more provided stop IDs do not exist',
      );
    }

    const coordinates = orderedStops.map((stop) => [
      stop.longitude,
      stop.latitude,
    ]);
    const geometry = { type: 'LineString', coordinates };

    const route = this.routes.create({
      name: dto.name,
      originStopId,
      destinationStopId,
      geometry: geometry,
      distance: this.distanceInKilometers(dto.distance),
      companyName: dto.companyName,
      pickupLocation: dto.pickupLocation,
      dropOffLocation: dto.dropOffLocation,
      roadName: dto.roadName,
      duration: dto.duration,
      transfers: dto.transfers ?? 0,
      departureTimes: dto.departureTimes ?? [],
      isActive: dto.isActive ?? true,
      featured: dto.featured || false,
    });
    await this.routes.save(route);

    const routeStops = allStopIds.map((stopId, index) =>
      this.routeStops.create({
        routeId: route.id,
        stopId,
        sequence: index + 1,
      }),
    );
    await this.routeStops.save(routeStops);

    return this.findOne(route.id);
  }

  async findAll(originStopId?: number, destinationStopId?: number) {
    const qb = this.routes
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.routeStops', 'routeStop')
      .leftJoinAndSelect('routeStop.stop', 'stop')
      .leftJoinAndSelect('route.originStop', 'origin')
      .leftJoinAndSelect('route.destinationStop', 'destination')
      .where('route.isActive = true');

    if (originStopId)
      qb.andWhere('route.originStopId = :originStopId', { originStopId });
    if (destinationStopId)
      qb.andWhere('route.destinationStopId = :destinationStopId', {
        destinationStopId,
      });

    const routes = await qb.getMany();
    const formattedRoutes = [];
    for (const route of routes) {
      formattedRoutes.push(await this.formatRouteResponse(route));
    }
    return formattedRoutes;
  }

  async search(originName: string, destName: string) {
    const qb = this.routes
      .createQueryBuilder('route')
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
      relations: { routeStops: { stop: true } },
    });
    if (!route) throw new NotFoundException('Route not found');
    return this.formatRouteResponse(route);
  }

  async findAllAdmin() {
    const routes = await this.routes.find({
      relations: { routeStops: { stop: true } },
    });
    const formattedRoutes = [];
    for (const route of routes) {
      formattedRoutes.push(await this.formatRouteResponse(route));
    }
    return formattedRoutes;
  }

  private async formatRouteResponse(route: Route) {
    const sortedStops = [...(route.routeStops ?? [])].sort(
      (a, b) => a.sequence - b.sequence,
    );
    const routeStopsFormatted = sortedStops
      .filter((rs) => !!rs.stop)
      .map((rs) => ({ id: rs.stop.id, name: rs.stop.name }));

    const rawFares = await this.fares.find({
      where: { routeId: route.id },
      relations: { originStop: true, destinationStop: true },
    });

    const faresFormatted = rawFares.map((fare) => ({
      id: String(fare.id),
      routeId: String(fare.routeId),
      originStopId: fare.originStopId,
      destinationStopId: fare.destinationStopId,
      amount: Number(fare.amount),
      currency: fare.currency,
    }));

    const schedules = await this.schedules.find({
      where: { routeId: route.id, isActive: true },
    });
    const departureTimes = schedules.map((schedule) =>
      schedule.departureTime.slice(0, 5),
    );

    const fullRouteFare = rawFares.find(
      (f) =>
        f.originStopId === route.originStopId &&
        f.destinationStopId === route.destinationStopId,
    );

    return {
      id: String(route.id),
      name: route.name,
      companyName: route.companyName ?? null,
      roadName: route.roadName ?? null,
      originStop: route.originStop
        ? { id: route.originStop.id, name: route.originStop.name }
        : null,
      destinationStop: route.destinationStop
        ? { id: route.destinationStop.id, name: route.destinationStop.name }
        : null,
      routeStops: routeStopsFormatted,
      stops: routeStopsFormatted,
      geometry: route.geometry,
      distance: this.distanceInKilometers(route.distance) ?? null,
      pickupLocation: route.pickupLocation,
      dropOffLocation: route.dropOffLocation ?? null,
      featured: route.featured,
      active: route.isActive,
      isActive: route.isActive,
      fareEstimate: fullRouteFare ? Number(fullRouteFare.amount) : null,
      fare: fullRouteFare
        ? {
            amount: Number(fullRouteFare.amount),
            currency: fullRouteFare.currency,
          }
        : null,
      currency: fullRouteFare?.currency ?? 'MWK',
      departureTimes: route.departureTimes?.length
        ? route.departureTimes
        : departureTimes,
      duration: route.duration ?? null,
      transfers: route.transfers ?? 0,
      fares: faresFormatted,
    };
  }

  async updateRouteStops(routeId: number, stopIds: number[]) {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');
    if (stopIds.length < 2)
      throw new BadRequestException('A route must have at least 2 stops');
    if (new Set(stopIds).size !== stopIds.length) {
      throw new BadRequestException('Route stops must be unique');
    }

    const stops = await this.stops.findBy({ id: In(stopIds) });
    const orderedStops = stopIds
      .map((id) => stops.find((s) => s.id === id))
      .filter((s) => s !== undefined);
    if (orderedStops.length !== stopIds.length) {
      throw new BadRequestException(
        'One or more provided stop IDs do not exist',
      );
    }

    const coordinates = orderedStops.map((stop) => [
      stop.longitude,
      stop.latitude,
    ]);
    route.geometry = { type: 'LineString', coordinates };
    route.originStopId = stopIds[0];
    route.destinationStopId = stopIds[stopIds.length - 1];
    await this.routes.save(route);

    await this.routeStops.delete({ routeId });
    const newStops = stopIds.map((stopId, index) =>
      this.routeStops.create({
        routeId,
        stopId,
        sequence: index + 1,
      }),
    );
    await this.routeStops.save(newStops);

    return this.findOne(routeId);
  }

  async updateRouteFare(routeId: number, amount?: number, currency = 'MWK') {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');

    let fare = await this.fares.findOne({
      where: {
        routeId,
        originStopId: route.originStopId,
        destinationStopId: route.destinationStopId,
      },
    });

    if (fare) {
      if (amount !== undefined) fare.amount = amount;
      fare.currency = currency || 'MWK';
      return this.fares.save(fare);
    } else {
      if (amount === undefined) {
        throw new BadRequestException(
          'Fare amount is required when creating a route fare',
        );
      }
      fare = this.fares.create({
        routeId,
        originStopId: route.originStopId,
        destinationStopId: route.destinationStopId,
        amount,
        currency: 'MWK',
      });
      return this.fares.save(fare);
    }
  }

  async update(id: number, dto: UpdateRouteDto, user: any) {
    await this.findOne(id);
    const updateData: any = { ...dto };

    const stopFieldsChanged =
      dto.originStopId !== undefined ||
      dto.destinationStopId !== undefined ||
      dto.origin !== undefined ||
      dto.destination !== undefined ||
      dto.intermediateStopIds !== undefined ||
      dto.intermediateStops !== undefined;
    if (stopFieldsChanged) {
      const existingRoute = await this.routes.findOne({ where: { id } });
      if (!existingRoute) throw new NotFoundException('Route not found');

      const originStopId =
        dto.originStopId ??
        (dto.origin
          ? await this.resolveStopName(dto.origin)
          : existingRoute.originStopId);
      const destinationStopId =
        dto.destinationStopId ??
        (dto.destination
          ? await this.resolveStopName(dto.destination)
          : existingRoute.destinationStopId);

      let intermediateStopIds: number[];
      if (dto.intermediateStopIds !== undefined) {
        intermediateStopIds = dto.intermediateStopIds;
      } else if (dto.intermediateStops !== undefined) {
        intermediateStopIds = [];
        for (const name of dto.intermediateStops) {
          intermediateStopIds.push(await this.resolveStopName(name));
        }
      } else {
        const existingStops = await this.routeStops.find({
          where: { routeId: id },
          order: { sequence: 'ASC' },
        });
        intermediateStopIds = existingStops
          .map((routeStop) => routeStop.stopId)
          .filter(
            (stopId) =>
              stopId !== existingRoute.originStopId &&
              stopId !== existingRoute.destinationStopId,
          );
      }

      const allStopIds = [
        originStopId,
        ...intermediateStopIds,
        destinationStopId,
      ];
      if (new Set(allStopIds).size !== allStopIds.length) {
        throw new BadRequestException('Route stops must be unique');
      }
      const stops = await this.stops.findBy({ id: In(allStopIds) });
      const orderedStops = allStopIds
        .map((stopId) => stops.find((stop) => stop.id === stopId))
        .filter((stop) => stop !== undefined);
      if (orderedStops.length !== allStopIds.length) {
        throw new BadRequestException(
          'One or more provided stop IDs do not exist',
        );
      }
      updateData.geometry = {
        type: 'LineString',
        coordinates: orderedStops.map((stop) => [
          stop.longitude,
          stop.latitude,
        ]),
      };
      updateData.originStopId = originStopId;
      updateData.destinationStopId = destinationStopId;

      await this.routeStops.delete({ routeId: id });
      const newStops = allStopIds.map((stopId, index) =>
        this.routeStops.create({ routeId: id, stopId, sequence: index + 1 }),
      );
      await this.routeStops.save(newStops);
    }

    // Remove name fields that don't map to DB columns
    delete updateData.origin;
    delete updateData.destination;
    delete updateData.intermediateStops;
    delete updateData.intermediateStopIds;

    if (updateData.distance !== undefined) {
      updateData.distance = this.distanceInKilometers(updateData.distance);
    }

    await this.routes.update(id, updateData);
    return this.findOne(id);
  }

  private async resolveStopName(name: string): Promise<number> {
    const trimmed = name.trim();
    let stop = await this.stops.findOne({ where: { name: trimmed } });
    if (!stop) {
      stop = await this.stops
        .createQueryBuilder('s')
        .where('s.name ILIKE :name', { name: trimmed })
        .getOne();
    }
    if (!stop) {
      stop = await this.stops.save(
        this.stops.create({
          name: trimmed,
          latitude: 0,
          longitude: 0,
          isActive: true,
        }),
      );
    }
    return stop.id;
  }

  private distanceInKilometers(distance?: number | null): number | undefined {
    if (distance == null) return undefined;
    return distance > 10_000 ? distance / 1_000 : distance;
  }

  async remove(id: number, user: any) {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');

    const schedules = await this.schedules.find({ where: { routeId: id } });
    if (schedules.length > 0) {
      route.isActive = false;
      await this.routes.save(route);
      return undefined;
    }

    await this.routes.remove(route);
    return undefined;
  }
}
