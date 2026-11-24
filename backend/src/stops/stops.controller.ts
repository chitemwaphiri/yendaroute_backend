import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { StopsService } from './stops.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopDto } from './dto/query-stop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

class StopResponse {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

@ApiTags('Stops')
@Controller('api/v1/stops')
export class StopsController {
  constructor(private readonly svc: StopsService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List all active stops (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'name', required: false, example: 'Lilongwe' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of stops',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  findAll(@Query() q: QueryStopDto) {
    return this.svc.findAll(q);
  }

  @Get('nearby')
  nearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.svc.nearby(+lat, +lng, radius ? +radius : 1000);
  }

  @Get('places/search')
  @ApiOperation({
    summary: 'Search stops by name (partial, case-insensitive)',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'The search text (stop name)',
    example: 'Zomba',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max number of results to return',
    example: 8,
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching stops',
    type: [StopResponse],
  })
  searchPlaces(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.search(q || '', limit ? +limit : 8);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stop by ID' })
  @ApiResponse({
    status: 200,
    description: 'The stop',
    type: StopResponse,
  })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new stop' })
  @ApiBody({
    type: CreateStopDto,
    examples: {
      contract: {
        summary: 'Create a stop',
        value: {
          name: 'Lilongwe Old Town',
          latitude: -13.9626,
          longitude: 33.7741,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Stop created',
    type: StopResponse,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  create(@Body() dto: CreateStopDto) {
    return this.svc.create(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a stop' })
  @ApiBody({ type: UpdateStopDto })
  @ApiResponse({
    status: 200,
    description: 'Stop updated',
    type: StopResponse,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStopDto) {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a stop' })
  @ApiResponse({ status: 204, description: 'Stop deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
