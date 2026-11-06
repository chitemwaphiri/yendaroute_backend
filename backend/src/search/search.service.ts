import { Injectable } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { StopsService } from '../stops/stops.service';
import { SchedulesService } from '../schedules/schedules.service';

// DEPRECATED FACADE — the real logic now lives in the feature services.
// These methods exist so the old /api/v1/search/... URLs keep working.
@Injectable()
export class SearchService {
  constructor(
    private readonly routes: RoutesService,
    private readonly stops: StopsService,
    private readonly schedules: SchedulesService,
  ) {}

  searchRoutes(originStopId: number, destinationStopId: number) {
    return this.routes.searchBetween(originStopId, destinationStopId);
  }

  searchDestinations(query: string) {
    return this.stops.search(query);
  }

  async nearbyTrip(lat: number, lng: number, destination: string) {
    const { originStop, destinationStop } = await this.stops.nearbyTrip(
      lat,
      lng,
      destination,
    );
    const availableRoutes = await this.routes.searchBetween(
      originStop.id,
      destinationStop.id,
    );
    return { originStop, destinationStop, availableRoutes };
  }

  searchDepartures(originStopId: number, destinationStopId: number, date?: string) {
    return this.schedules.searchDepartures(originStopId, destinationStopId, date);
  }

  async searchByCityNames(from: string, to: string, date?: string) {
    const { originStop, destinationStop } = await this.routes.searchByCity(
      from,
      to,
    );
    return this.schedules.searchDepartures(
      originStop.id,
      destinationStop.id,
      date,
    );
  }

  findConnections(originStopId: number, destinationStopId: number) {
    return this.routes.findConnections(originStopId, destinationStopId);
  }
}