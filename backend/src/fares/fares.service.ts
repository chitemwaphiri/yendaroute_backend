import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fare } from './entities/fare.entity';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';

@Injectable()
export class FaresService {
  constructor(
    @InjectRepository(Fare) private fares: Repository<Fare>,
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(RouteStop) private routeStops: Repository<RouteStop>,
  ) {}

  async create(routeId: number, dto: CreateFareDto) {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');

    const origin = await this.routeStops.findOne({ where: { routeId, stopId: dto.originStopId } });
    const dest = await this.routeStops.findOne({ where: { routeId, stopId: dto.destinationStopId } });

    if (!origin || !dest) {
      throw new BadRequestException('Origin and destination stops must belong to this route');
    }

    if (origin.sequence >= dest.sequence) {
      throw new BadRequestException('Origin stop must come before destination stop in the route sequence');
    }

    const fare = this.fares.create({
      routeId,
      originStopId: dto.originStopId,
      destinationStopId: dto.destinationStopId,
      amount: dto.amount,
      currency: dto.currency || 'MWK',
    });

    return this.fares.save(fare);
  }

  /**
   * Returns the fare for travelling between two stops on a route.
   * If no direct fare exists, adjacent segment fares are summed in route order.
   * Public so booking and schedule services can reuse the same fare rules.
   */
  public async fareBetween(routeId: number, originStopId: number, destinationStopId: number): Promise<number | null> {
    if (originStopId === destinationStopId) {
      throw new BadRequestException('Origin and destination stops must be different');
    }

    const [origin, destination] = await Promise.all([
      this.routeStops.findOne({ where: { routeId, stopId: originStopId } }),
      this.routeStops.findOne({ where: { routeId, stopId: destinationStopId } }),
    ]);

    if (!origin || !destination || origin.sequence >= destination.sequence) {
      throw new BadRequestException('Stops must belong to the route and origin must come before destination');
    }

    const direct = await this.fares.findOne({
      where: { routeId, originStopId, destinationStopId },
    });
    if (direct) return Number(direct.amount);

    const stops = await this.routeStops.find({
      where: { routeId },
      order: { sequence: 'ASC' },
    });
    const segmentStops = stops.filter((stop) =>
      stop.sequence >= origin.sequence && stop.sequence <= destination.sequence,
    );

    let total = 0;
    for (let index = 0; index < segmentStops.length - 1; index++) {
      const segmentFare = await this.fares.findOne({
        where: {
          routeId,
          originStopId: segmentStops[index].stopId,
          destinationStopId: segmentStops[index + 1].stopId,
        },
      });
      if (!segmentFare) return null;
      total += Number(segmentFare.amount);
    }
    return total;
  }

  async findByRoute(routeId: number) {
    return this.fares.find({ where: { routeId } });
  }

  async update(id: number, dto: UpdateFareDto) {
    const fare = await this.fares.findOne({ where: { id } });
    if (!fare) throw new NotFoundException('Fare not found');
    await this.fares.update(id, dto);
    return this.fares.findOne({ where: { id } });
  }

  async remove(id: number) {
    const fare = await this.fares.findOne({ where: { id } });
    if (!fare) throw new NotFoundException('Fare not found');
    await this.fares.remove(fare);
    return { deleted: true, id };
  }
}