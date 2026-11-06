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
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { FaresService } from './fares.service';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Fares')
@ApiBearerAuth('access-token')
@Controller('api/v1/routes/:routeId/fares')
export class FaresController {
  constructor(private readonly faresService: FaresService) {}

  // GET all fares for a route or filter by stops
  @Get()
  @ApiOperation({
    summary: 'Retrieve fares for a route',
    description:
      'Returns all fares for a route or filters by origin and destination stops.',
  })
  @ApiQuery({
    name: 'originStopId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'destinationStopId',
    required: false,
    type: Number,
  })
  findByRoute(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Query('originStopId', new ParseIntPipe({ optional: true }))
    originStopId?: number,
    @Query('destinationStopId', new ParseIntPipe({ optional: true }))
    destinationStopId?: number,
  ) {
    return this.faresService.findByRoute(
      routeId,
      originStopId,
      destinationStopId,
    );
  }

  // POST create a fare for a route (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({
    summary: 'Create a fare for a route',
  })
  create(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() dto: CreateFareDto,
  ) {
    return this.faresService.create(routeId, dto);
  }

  // PATCH update a fare (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a fare on a route',
  })
  update(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFareDto,
  ) {
    return this.faresService.update(routeId, id, dto);
  }

  // DELETE remove a fare (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a fare from a route',
  })
  remove(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.faresService.remove(routeId, id);
  }
}