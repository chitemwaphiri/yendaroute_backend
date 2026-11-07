<<<<<<< HEAD
import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
=======
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
>>>>>>> 5d17364a22bba3771f26b2597ca089703f996fe9
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Routes')
@Controller('api/v1/routes')
export class RoutesController {
  constructor(private readonly svc: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'Search for available routes between two stops (e.g. Zomba to Mzuzu)' })
  @ApiQuery({ name: 'originStopId', required: false, description: 'ID of the starting stop' })
  @ApiQuery({ name: 'destinationStopId', required: false, description: 'ID of the ending stop' })
  findAll(
    @Query('originStopId') originStopId?: string,
    @Query('destinationStopId') destinationStopId?: string,
  ) {
    return this.svc.findAll(
      originStopId ? +originStopId : undefined, 
      destinationStopId ? +destinationStopId : undefined
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

<<<<<<< HEAD
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
=======
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
>>>>>>> 5d17364a22bba3771f26b2597ca089703f996fe9
  @Post()
  create(@Body() dto: CreateRouteDto, @Req() req: any) {
    return this.svc.create(dto, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRouteDto, @Req() req: any) {
    return this.svc.update(id, dto, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.remove(id, req.user);
  }
}