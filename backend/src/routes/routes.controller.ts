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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRouteDto } from './dto/query-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Routes')
@ApiBearerAuth('access-token')
@Controller('api/v1/routes')
export class RoutesController {
  constructor(private readonly svc: RoutesService) {}

  @Get()
  findAll(@Query() q: QueryRouteDto) {
    return this.svc.findAll(q);
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
