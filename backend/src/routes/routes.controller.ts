import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseFloatPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { SchedulesService } from '../schedules/schedules.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRouteDto } from './dto/query-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Routes')
@ApiBearerAuth('access-token')
@Controller('api/v1/routes')
export class RoutesController {
  constructor(
    private readonly svc: RoutesService,
    private readonly schedulesSvc: SchedulesService,
  ) {}

  @Get()
  findAll(@Query() q: QueryRouteDto) {
    return this.svc.findAll(q);
  }

  @Get('search/by-city')
  @ApiOperation({ summary: 'Find routes + departures between two city names' })
  @ApiQuery({ name: 'from', example: 'Lilongwe' })
  @ApiQuery({ name: 'to', example: 'Blantyre' })
  @ApiQuery({ name: 'date', required: false, example: '2026-12-15' })
  async searchByCity(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date?: string,
  ) {
    const { originStop, destinationStop } = await this.svc.searchByCity(
      from,
      to,
    );
    return this.schedulesSvc.searchDepartures(
      originStop.id,
      destinationStop.id,
      date,
    );
  }

  @Get('between')
  @ApiOperation({ summary: 'Routes between two stops (by id)' })
  @ApiQuery({ name: 'originStopId', example: 1 })
  @ApiQuery({ name: 'destinationStopId', example: 2 })
  searchBetween(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.svc.searchBetween(originStopId, destinationStopId);
  }

  @ApiExcludeEndpoint()
  @Get('connections')
  findConnections(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.svc.findConnections(originStopId, destinationStopId);
  }

  // Keep this before @Get(':id') so "count" is not parsed as an ID.
  @Get('count')
  count() {
    return this.svc.count();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Get(':id/stops')
  findStops(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findStops(id);
  }
    @Get(':id/stops/upcoming')
  @ApiOperation({ summary: 'Nearest stop to the driver and the next stops ahead' })
  @ApiQuery({ name: 'lat', example: -15.7861 })
  @ApiQuery({ name: 'lng', example: 35.0058 })
  @ApiQuery({ name: 'limit', required: false, example: 3 })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: ['forward', 'reverse'],
    description: 'forward = origin to destination, reverse = destination to origin',
  })
  findUpcomingStops(
    @Param('id', ParseIntPipe) id: number,
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number,
    @Query('direction') direction: 'forward' | 'reverse' = 'forward',
  ) {
    return this.svc.findUpcomingStops(id, lat, lng, limit, direction);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  @ApiQuery({
    name: 'nearbyStopId',
    required: false,
    type: Number,
    description: 'Optional nearby stop ID to append as an intermediate stop',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRouteDto,
    @Query('nearbyStopId') nearbyStopId?: string,
  ) {
    const parsedNearbyStopId =
      nearbyStopId === undefined ? undefined : Number(nearbyStopId);
    return this.svc.update(id, dto, parsedNearbyStopId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}