import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

export interface BusStop {
  id: number;
  name: string;
  location: string;
  routeId: number;
  stopOrder: number;
}

@Injectable()
export class StopsService {
  private stops: BusStop[] = [];
  private nextId = 1;

  create(data: {
    name: string;
    location: string;
    routeId: number;
    stopOrder: number;
  }) {
    if (
      !data.name ||
      !data.location ||
      !Number.isInteger(data.routeId) ||
      data.routeId <= 0 ||
      !Number.isInteger(data.stopOrder) ||
      data.stopOrder <= 0
    ) {
      throw new BadRequestException('Invalid bus stop information');
    }

    const existingStop = this.stops.find(
      (stop) =>
        stop.routeId === data.routeId &&
        stop.stopOrder === data.stopOrder,
    );

    if (existingStop) {
      throw new BadRequestException(
        'Another stop already uses this position on the route',
      );
    }

    const stop: BusStop = {
      id: this.nextId++,
      name: data.name,
      location: data.location,
      routeId: data.routeId,
      stopOrder: data.stopOrder,
    };

    this.stops.push(stop);

    return {
      message: 'Bus stop created successfully',
      stop,
    };
  }

  findAll() {
    return this.stops;
  }

  findOne(id: number) {
    const stop = this.stops.find((item) => item.id === id);

    if (!stop) {
      throw new NotFoundException('Bus stop not found');
    }

    return stop;
  }

  findByRoute(routeId: number) {
    return this.stops
      .filter((stop) => stop.routeId === routeId)
      .sort((a, b) => a.stopOrder - b.stopOrder);
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      location: string;
      routeId: number;
      stopOrder: number;
    }>,
  ) {
    const stop = this.findOne(id);

    const updated = { ...stop, ...data };

    if (
      !updated.name ||
      !updated.location ||
      !Number.isInteger(updated.routeId) ||
      updated.routeId <= 0 ||
      !Number.isInteger(updated.stopOrder) ||
      updated.stopOrder <= 0
    ) {
      throw new BadRequestException('Invalid bus stop information');
    }

    const duplicate = this.stops.find(
      (item) =>
        item.id !== id &&
        item.routeId === updated.routeId &&
        item.stopOrder === updated.stopOrder,
    );

    if (duplicate) {
      throw new BadRequestException(
        'Another stop already uses this position on the route',
      );
    }

    Object.assign(stop, data);

    return {
      message: 'Bus stop updated successfully',
      stop,
    };
  }

  remove(id: number) {
    const index = this.stops.findIndex((stop) => stop.id === id);

    if (index === -1) {
      throw new NotFoundException('Bus stop not found');
    }

    const deletedStop = this.stops.splice(index, 1)[0];

    return {
      message: 'Bus stop deleted successfully',
      deletedStop,
    };
  }
}