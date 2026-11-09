import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger'; // <-- Import ApiQuery and ApiOperation
import { StopsService } from './stops.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopDto } from './dto/query-stop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Stops')
@Controller('api/v1/stops')
export class StopsController {
  constructor(private readonly svc: StopsService) {}

  @Get()
  findAll(@Query() q: QueryStopDto) { return this.svc.findAll(q); }

  @Get('nearby')
  nearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius?: string) {
    return this.svc.nearby(+lat, +lng, radius ? +radius : 1000);
  }

  // 👇 ADD SWAGGER DOCUMENTATION HERE 👇
  @Get('places/search')
  @ApiOperation({ summary: 'Auto-complete search for stops (e.g. type "Zom" to find "Zomba")' })
  @ApiQuery({ name: 'q', required: true, description: 'The search text (stop name)', example: 'Zomba' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of results to return', example: 8 })
  searchPlaces(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.findAll({ name: q || '', limit: limit ? +limit : 8, page: 1 });
  }
  // 👆 --------------------------------- 👆

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateStopDto) { return this.svc.create(dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStopDto) {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}