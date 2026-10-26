import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Route } from '../routes/entities/route.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Route) private routes: Repository<Route>,
    @InjectRepository(Stop) private stops: Repository<Stop>,
    @InjectRepository(Schedule) private schedules: Repository<Schedule>,
    @InjectRepository(Fare) private fares: Repository<Fare>,
    private dataSource: DataSource,
  ) {}

  // 1. Search routes between two stops by ID
  async searchRoutes(originStopId: number, destinationStopId: number) {
    return this.routes.find({
      where: { originStopId, destinationStopId, isActive: true },
    });
  }

  // 2. Search destinations (typeahead)
  async searchDestinations(query: string) {
    return this.stops
      .createQueryBuilder('stop')
      .where('stop.name ILIKE :query', { query: `%${query}%` })
      .andWhere('stop.isActive = true')
      .limit(10)
      .getMany();
  }

  // 3. Nearby trip (from coordinates)
  async nearbyTrip(lat: number, lng: number, destination: string) {
    const nearbyStops = await this.stops
      .createQueryBuilder('stop')
      .where('stop.isActive = true')
      .orderBy(
        `ST_Distance(
          geography(ST_MakePoint(stop.longitude, stop.latitude)),
          geography(ST_MakePoint(:lng, :lat))
        )`,
        'ASC',
      )
      .setParameters({ lng, lat })
      .limit(1)
      .getMany();

    if (!nearbyStops.length) throw new NotFoundException('No nearby stops found');
    const originStop = nearbyStops[0];

    const destStop = await this.stops
      .createQueryBuilder('stop')
      .where('stop.name ILIKE :dest OR stop.id::text = :dest', { dest: destination })
      .getOne();

    if (!destStop) throw new NotFoundException('Destination not found');

    const routes = await this.searchRoutes(originStop.id, destStop.id);
    
    return { originStop, destinationStop: destStop, availableRoutes: routes };
  }

  // 4. Search departures (by IDs)
  async searchDepartures(originStopId: number, destinationStopId: number, date?: string) {
    const routes = await this.searchRoutes(originStopId, destinationStopId);
    if (!routes.length) return [];

    const routeIds = routes.map((r) => r.id);

    const schedules = await this.schedules
      .createQueryBuilder('schedule')
      .where('schedule.routeId IN (:...routeIds)', { routeIds })
      .andWhere('schedule.isActive = true')
      .getMany();

    const results: any[] = [];

    for (const schedule of schedules) {
      let availableSeats = schedule.seatCapacity;
      
      if (date) {
        const booked = await this.dataSource
          .createQueryBuilder(Booking, 'b')
          .select('SUM(b.seats)', 'total')
          .where('b.scheduleId = :id', { id: schedule.id })
          .andWhere('b.travelDate = :date', { date })
          .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
          .getRawOne();
        
        const bookedSeats = Number(booked?.total) || 0;
        availableSeats = Math.max(0, schedule.seatCapacity - bookedSeats);
      }

      const fare = await this.fares.findOne({
        where: { routeId: schedule.routeId, originStopId, destinationStopId },
      });

      results.push({
        schedule,
        route: schedule.route,
        availableSeats,
        fare: fare ? { amount: fare.amount, currency: fare.currency } : null,
      });
    }

    return results;
  }

  // 5. NEW: Search by City Names (e.g., "Lilongwe" to "Blantyre")
  async searchByCityNames(from: string, to: string, date?: string) {
    // Find origin stop (case-insensitive partial match)
    const originStop = await this.stops
      .createQueryBuilder('stop')
      .where('stop.name ILIKE :name', { name: `%${from}%` })
      .andWhere('stop.isActive = true')
      .getOne();

    // Find destination stop
    const destStop = await this.stops
      .createQueryBuilder('stop')
      .where('stop.name ILIKE :name', { name: `%${to}%` })
      .andWhere('stop.isActive = true')
      .getOne();

    if (!originStop) throw new NotFoundException(`Origin '${from}' not found`);
    if (!destStop) throw new NotFoundException(`Destination '${to}' not found`);

    // Reuse the existing departures search using the IDs we found
    return this.searchDepartures(originStop.id, destStop.id, date);
  }

  // 6. Multi-leg connections
  async findConnections(originStopId: number, destinationStopId: number) {
    const firstLegs = await this.dataSource
      .createQueryBuilder(Route, 'r1')
      .where('r1.originStopId = :originStopId', { originStopId })
      .andWhere('r1.isActive = true')
      .getMany();

    if (!firstLegs.length) return [];

    const secondLegs = await this.dataSource
      .createQueryBuilder(Route, 'r2')
      .where('r2.destinationStopId = :destinationStopId', { destinationStopId })
      .andWhere('r2.isActive = true')
      .getMany();

    if (!secondLegs.length) return [];

    const connections: any[] = [];
    for (const leg1 of firstLegs) {
      for (const leg2 of secondLegs) {
        if (leg1.destinationStopId === leg2.originStopId && leg1.id !== leg2.id) {
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
}