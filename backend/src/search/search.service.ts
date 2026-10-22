import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stop } from '../stops/entities/stop.entity';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Stop)
    private readonly stopRepository: Repository<Stop>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async searchByCityNames(from: string, to: string, date?: string) {
    return this.routeRepository.find({
      where: { isActive: true },
      relations: {
        originStop: true,
        destinationStop: true,
        routeStops: { stop: true },
        transportType: true,
      },
    });
  }

  async searchDestinations(query: string): Promise<Stop[]> {
    return this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.name ILIKE :q', { q: `%${query}%` })
      .getMany();
  }

  async nearbyTrip(lat: number, lng: number, destination?: string) {
    return this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.latitude IS NOT NULL AND stop.longitude IS NOT NULL')
      .getMany();
  }

  async searchDepartures(
    originStopId: number,
    destinationStopId: number,
    date?: string,
  ) {
    return this.routeRepository.find({
      where: { originStopId, destinationStopId, isActive: true },
      relations: {
        originStop: true,
        destinationStop: true,
        routeStops: { stop: true },
        transportType: true,
      },
    });
  }

  async searchRoutes(originStopId: number, destinationStopId: number) {
    return this.routeRepository.find({
      where: { originStopId, destinationStopId, isActive: true },
      relations: {
        originStop: true,
        destinationStop: true,
        routeStops: { stop: true },
        transportType: true,
      },
    });
  }

  async findConnections(originStopId: number, destinationStopId: number) {
    return this.routeRepository.find({
      where: { isActive: true },
      relations: {
        originStop: true,
        destinationStop: true,
        routeStops: { stop: true },
      },
    });
  }

  async countConfirmedBookings(): Promise<number> {
    return this.bookingRepository.count({
      where: { status: BookingStatus.CONFIRMED },
    });
  }
}