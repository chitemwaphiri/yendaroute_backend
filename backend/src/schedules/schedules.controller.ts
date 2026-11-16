import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';

@ApiTags('Schedules')
@Controller('api/v1/schedules')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  @Get()
  findAll(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
    @Query('routeId') routeId?: string,
    @Query('date') date?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll({
      origin,
      destination,
      routeId: routeId ? Number(routeId) : undefined,
      date,
      availableOnly: availableOnly === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id/seats')
  getSeats(@Param('id', ParseIntPipe) id: number, @Query('date') date: string) {
    return this.svc.getSeats(id, date);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Query('date') date?: string) {
    return this.svc.findOne(id, date);
  }
}
