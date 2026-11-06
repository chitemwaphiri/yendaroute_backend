import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransportService } from './transport.service';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Transport Types')
@ApiBearerAuth('access-token')
@Controller('api/v1/transport')
export class TransportController {
  constructor(private readonly svc: TransportService) {}

  @Get()
  @ApiOperation({ summary: 'List all transports with vehicle and driver details' })
  @ApiResponse({ status: 200, description: 'List of transports' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one transport by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Transport found' })
  @ApiResponse({ status: 404, description: 'Transport not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({ summary: 'Create a transport (admin only)' })
  @ApiResponse({ status: 201, description: 'Transport created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 409, description: 'Plate number already registered' })
  create(@Body() dto: CreateTransportTypeDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a transport (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Transport updated' })
  @ApiResponse({ status: 400, description: 'Validation failed or no fields given' })
  @ApiResponse({ status: 404, description: 'Transport not found' })
  @ApiResponse({ status: 409, description: 'Plate number already registered' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransportTypeDto,
  ) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transport (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Transport deleted' })
  @ApiResponse({ status: 404, description: 'Transport not found' })
  @ApiResponse({ status: 409, description: 'Transport is used by a route or schedule' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}