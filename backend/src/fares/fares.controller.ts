import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FaresService } from './fares.service';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Fares')
@Controller('api/v1')
export class FaresController {
  constructor(private readonly svc: FaresService) {}

  @Get('routes/:routeId/fares')
  findByRoute(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.svc.findByRoute(routeId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('routes/:routeId/fares')
  create(@Param('routeId', ParseIntPipe) routeId: number, @Body() dto: CreateFareDto) {
    return this.svc.create(routeId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('fares/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFareDto) {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('fares/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}