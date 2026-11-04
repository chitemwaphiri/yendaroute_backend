import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Fare } from './entities/fare.entity';
import { Route } from '../routes/entities/route.entity';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';

@Injectable()
export class FaresService {
  constructor(
    @InjectRepository(Fare)
    private readonly fares: Repository<Fare>,

    @InjectRepository(Route)
    private readonly routes: Repository<Route>,
  ) {}

  // Check whether the route exists
  private async checkRoute(routeId: number): Promise<Route> {
    const route = await this.routes.findOne({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundException(
        `Route with ID ${routeId} not found`,
      );
    }

    return route;
  }

  // Retrieve fares for a route, optionally filtered by stops
  async findByRoute(
    routeId: number,
    originStopId?: number,
    destinationStopId?: number,
  ) {
    await this.checkRoute(routeId);

    if (
      (originStopId === undefined) !==
      (destinationStopId === undefined)
    ) {
      throw new BadRequestException(
        'Both originStopId and destinationStopId must be provided',
      );
    }

    const where: {
      routeId: number;
      originStopId?: number;
      destinationStopId?: number;
    } = { routeId };

    if (
      originStopId !== undefined &&
      destinationStopId !== undefined
    ) {
      where.originStopId = originStopId;
      where.destinationStopId = destinationStopId;
    }

    return this.fares.find({ where });
  }

  // Create a fare under a particular route
  async create(routeId: number, dto: CreateFareDto) {
    await this.checkRoute(routeId);

    if (dto.originStopId === dto.destinationStopId) {
      throw new BadRequestException(
        'Origin and destination stops cannot be the same',
      );
    }

    const existingFare = await this.fares.findOne({
      where: {
        routeId,
        originStopId: dto.originStopId,
        destinationStopId: dto.destinationStopId,
      },
    });

    if (existingFare) {
      throw new ConflictException(
        'A fare already exists for these stops on this route',
      );
    }

    const fare = this.fares.create({
      ...dto,
      routeId,
      currency: dto.currency ?? 'MWK',
    });

    return this.fares.save(fare);
  }

  // Update an existing fare on a particular route
  async update(
    routeId: number,
    id: number,
    dto: UpdateFareDto,
  ) {
    await this.checkRoute(routeId);

    const fare = await this.fares.findOne({
      where: { id, routeId },
    });

    if (!fare) {
      throw new NotFoundException(
        `Fare with ID ${id} not found on route ${routeId}`,
      );
    }

    const updatedOrigin =
      dto.originStopId ?? fare.originStopId;

    const updatedDestination =
      dto.destinationStopId ?? fare.destinationStopId;

    if (updatedOrigin === updatedDestination) {
      throw new BadRequestException(
        'Origin and destination stops cannot be the same',
      );
    }

    const duplicate = await this.fares.findOne({
      where: {
        routeId,
        originStopId: updatedOrigin,
        destinationStopId: updatedDestination,
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(
        'A fare already exists for these stops on this route',
      );
    }

    Object.assign(fare, dto);

    return this.fares.save(fare);
  }

  // Delete a fare belonging to a particular route
  async remove(routeId: number, id: number) {
    await this.checkRoute(routeId);

    const fare = await this.fares.findOne({
      where: { id, routeId },
    });

    if (!fare) {
      throw new NotFoundException(
        `Fare with ID ${id} not found on route ${routeId}`,
      );
    }

    await this.fares.remove(fare);

    return {
      message: 'Fare deleted successfully',
      id,
    };
  }
}