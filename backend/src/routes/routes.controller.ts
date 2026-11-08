import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
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

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
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