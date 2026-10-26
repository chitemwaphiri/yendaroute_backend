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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FaresService } from './fares.service';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Fares')
@ApiBearerAuth('access-token') // <--- FIX
@Controller('api/v1/fares')
export class FaresController {
  constructor(private readonly svc: FaresService) {}

  @Get()
  findByStops(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
  ) {
    return this.svc.findByStops(originStopId, destinationStopId);
  }

  @Get('route/:routeId')
  findByRoute(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.svc.findByRoute(routeId);
  }

  @Get('estimate')
  estimate(
    @Query('originStopId', ParseIntPipe) originStopId: number,
    @Query('destinationStopId', ParseIntPipe) destinationStopId: number,
    @Query('routeId') routeId?: string,
  ) {
    return this.svc.estimate(
      originStopId,
      destinationStopId,
      routeId ? Number(routeId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateFareDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFareDto) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}