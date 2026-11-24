import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';

@ApiTags('Schedules')
@Controller('api/v1/schedules')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  @Get()
  @ApiQuery({ name: 'origin', required: false, example: 'Lilongwe' })
  @ApiQuery({ name: 'destination', required: false, example: 'Blantyre' })
  @ApiQuery({ name: 'date', required: false, example: '2026-11-23' })
  @ApiQuery({ name: 'routeId', required: false, example: '1' })
  @ApiQuery({ name: 'availableOnly', required: false, example: 'true' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: '20',
    deprecated: true,
  })
  findAll(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
    @Query('routeId') routeId?: string,
    @Query('date') date?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll({
      origin,
      destination,
      routeId: routeId ? Number(routeId) : undefined,
      date,
      availableOnly: availableOnly === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id/seats')
  getSeats(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date?: string,
  ) {
    return this.svc.getSeats(id, date);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Query('date') date?: string) {
    return this.svc.findOne(id, date);
  }
}
