import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StopsService } from './stops.service';
import { RoutesService } from '../routes/routes.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopDto } from './dto/query-stop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Stops')
@ApiBearerAuth('access-token')
@Controller('api/v1/stops')
export class StopsController {
  constructor(
    private readonly svc: StopsService,
    private readonly routesSvc: RoutesService,
  ) {}

  @Get()
  findAll(@Query() q: QueryStopDto) {
    return this.svc.findAll(q);
  }

  @Get('search')
  @ApiOperation({ summary: 'Typeahead: search active stops by name' })
  @ApiQuery({ name: 'query', required: false, example: 'Lilongwe' })
  search(@Query('query') query?: string) {
    return this.svc.search(query || '');
  }

  @Get('nearby')
  nearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.svc.nearby(+lat, +lng, radius ? +radius : 1000);
  }

  @Get('nearby-trip')
  @ApiOperation({ summary: 'Nearest stop + named destination + routes between them' })
  @ApiQuery({ name: 'lat', example: -13.9626 })
  @ApiQuery({ name: 'lng', example: 33.7741 })
  @ApiQuery({ name: 'destination', example: 'Blantyre' })
  async nearbyTrip(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('destination') destination: string,
  ) {
    const { originStop, destinationStop } = await this.svc.nearbyTrip(
      lat,
      lng,
      destination,
    );
    const availableRoutes = await this.routesSvc.searchBetween(
      originStop.id,
      destinationStop.id,
    );
    return { originStop, destinationStop, availableRoutes };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateStopDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStopDto) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}