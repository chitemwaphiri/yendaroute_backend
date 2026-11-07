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