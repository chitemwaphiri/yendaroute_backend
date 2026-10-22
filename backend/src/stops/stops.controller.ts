
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { StopsService } from './stops.service';

@Controller('stops')
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'location', 'routeId', 'stopOrder'],
      properties: {
        name: { type: 'string', example: 'Blantyre Bus Depot' },
        location: { type: 'string', example: 'Blantyre' },
        routeId: { type: 'number', example: 1 },
        stopOrder: { type: 'number', example: 1 },
      },
    },
  })
  createStop(
    @Body()
    data: {
      name: string;
      location: string;
      routeId: number;
      stopOrder: number;
    },
  ) {
    return this.stopsService.create(data);
  }

  @Get()
  getAllStops(@Query('routeId') routeId?: string) {
    if (routeId !== undefined) {
      const parsedRouteId = Number(routeId);

      if (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0) {
        throw new BadRequestException('Invalid route ID');
      }

      return this.stopsService.findByRoute(parsedRouteId);
    }

    return this.stopsService.findAll();
  }

  @Get(':id')
  getStop(@Param('id', ParseIntPipe) id: number) {
    return this.stopsService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Limbe Bus Stop' },
        location: { type: 'string', example: 'Limbe' },
        routeId: { type: 'number', example: 1 },
        stopOrder: { type: 'number', example: 2 },
      },
    },
  })
  updateStop(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: Partial<{
      name: string;
      location: string;
      routeId: number;
      stopOrder: number;
    }>,
  ) {
    return this.stopsService.update(id, data);
  }

  @Delete(':id')
  deleteStop(@Param('id', ParseIntPipe) id: number) {
    return this.stopsService.remove(id);
  }
}
