import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

class UpdateStopsDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Array of stop IDs in order' })
  stopIds: number[];
}

class UpdateFareDto {
  @ApiProperty({ example: 15000, description: 'New whole-route fare amount' })
  amount: number;
}

@ApiTags('Routes') // <-- THIS makes the title "Routes" in Swagger
@Controller('api/v1/routes')
export class RoutesController {
  constructor(private readonly svc: RoutesService) {}

  // --- PUBLIC ENDPOINTS ---

  @Get()
  @ApiOperation({ summary: 'Get routes with optional filters' })
  @ApiQuery({ name: 'originStopId', required: false })
  @ApiQuery({ name: 'destinationStopId', required: false })
  findAll(
    @Query('originStopId') originStopId?: string,
    @Query('destinationStopId') destinationStopId?: string,
  ) {
    return this.svc.findAll(
      originStopId ? +originStopId : undefined, 
      destinationStopId ? +destinationStopId : undefined
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search routes by city names (e.g. Zomba to Mzuzu)' })
  @ApiQuery({ name: 'origin', required: true })
  @ApiQuery({ name: 'destination', required: true })
  search(@Query('origin') origin: string, @Query('destination') destination: string) {
    return this.svc.search(origin, destination);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  // --- ADMIN ENDPOINTS ---

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/list')
  @ApiOperation({ summary: 'Admin: Get all routes (including inactive)' })
  findAllAdmin() {
    return this.svc.findAllAdmin();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateRouteDto, @Req() req: any) {
    return this.svc.create(dto, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRouteDto, @Req() req: any) {
    return this.svc.update(id, dto, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.remove(id, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/stops')
  updateStops(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStopsDto) {
    return this.svc.updateRouteStops(id, dto.stopIds);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/fare')
  updateFare(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFareDto) {
    return this.svc.updateRouteFare(id, dto.amount);
  }
}