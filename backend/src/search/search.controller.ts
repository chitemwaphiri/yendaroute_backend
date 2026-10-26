import { Controller, Get, Query, ParseIntPipe, ParseFloatPipe } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search & Trip Planning')
@Controller('api/v1')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  // ==========================================
  // VISIBLE ENDPOINTS (For your presentation)
  // ==========================================

  @Get('search/by-city')
  searchByCity(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    return this.svc.searchByCityNames(from, to, date);
  }

  @Get('search/destinations')
  searchDestinations(@Query('query') query: string) {
    return this.svc.searchDestinations(query || '');
  }

  @Get('search/nearby-trip')
  nearbyTrip(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('destination') destination: string,
  ) {
    return this.svc.nearbyTrip(lat, lng, destination);
  }

  @Get('search/departures')
  searchDepartures(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
    @Query('date') date?: string,
  ) {
    return this.svc.searchDepartures(originStopId, destinationStopId, date);
  }

  // ==========================================
  // HIDDEN ENDPOINTS (Still work, hidden from Swagger)
  // ==========================================

  @ApiExcludeEndpoint()
  @Get('search/routes')
  searchRoutes(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.svc.searchRoutes(originStopId, destinationStopId);
  }

  @ApiExcludeEndpoint()
  @Get('journeys/connections')
  findConnections(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.svc.findConnections(originStopId, destinationStopId);
  }
}