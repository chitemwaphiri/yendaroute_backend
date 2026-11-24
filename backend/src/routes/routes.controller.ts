import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';


class UpdateStopsDto {
  @ApiProperty({
    example: [1, 3, 2],
    description: 'Stop IDs in route order',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsInt({ each: true })
  @Min(1, { each: true })
  stopIds: number[];
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
      destinationStopId ? +destinationStopId : undefined,
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search routes by city names (e.g. Zomba to Mzuzu)',
  })
  @ApiQuery({ name: 'origin', required: true })
  @ApiQuery({ name: 'destination', required: true })
  search(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
  ) {
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
  @ApiBody({
    type: CreateRouteDto,
    examples: {
      contract: {
        summary: 'Create a route',
        value: {
          name: 'Lilongwe - Blantyre',
          roadName: 'M1',
          originStopId: 1,
          destinationStopId: 2,
          intermediateStopIds: [3],
          companyName: 'MOVA Express',
          pickupLocation: 'Lilongwe Bus Depot',
          dropOffLocation: 'Wenela Bus Depot',
          departureTimes: ['07:00', '14:00'],
          isActive: true,
          distance: 312.5,
          duration: '4h 30m',
          transfers: 0,
          featured: false,
        },
      },
      routeForm: {
        summary: 'Create a route from the admin route form',
        value: {
          name: 'Blantyre - Lilongwe',
          roadName: 'M1',
          originStopId: 1,
          destinationStopId: 2,
          intermediateStopIds: [],
          companyName: 'MOVA',
          pickupLocation: 'Wenela Bus Depot',
          dropOffLocation: 'Lilongwe Bus Depot',
          departureTimes: ['06:00'],
          isActive: true,
          featured: false,
        },
      },
    },
  })
  create(@Body() dto: CreateRouteDto, @Req() req: any) {
    return this.svc.create(dto, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRouteDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.remove(id, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/stops')
  updateStops(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStopsDto,
  ) {
    return this.svc.updateRouteStops(id, dto.stopIds);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/stops')
  replaceStops(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStopsDto,
  ) {
    return this.svc.updateRouteStops(id, dto.stopIds);
  }

}
