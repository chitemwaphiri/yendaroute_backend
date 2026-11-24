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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TransportService } from './transport.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateOperatorDto, UpdateOperatorDto } from './dto/operator.dto';

@ApiTags('Transport Means')
@Controller('api/v1/vehicles')
export class TransportController {
  constructor(private readonly svc: TransportService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('route/:routeId')
  findByRoute(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.svc.findByRoute(routeId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @ApiBody({
    type: CreateVehicleDto,
    examples: {
      contract: {
        summary: 'Create a vehicle',
        value: {
          name: 'MOVA 1',
          registrationNumber: 'BA 1234',
          type: 'Bus',
          seatCapacity: 42,
          isActive: true,
        },
      },
    },
  })
  create(@Body() dto: CreateVehicleDto) {
    return this.svc.create(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleDto) {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}

@ApiTags('Operators')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/v1/operators')
export class OperatorsController {
  constructor(private readonly svc: TransportService) {}

  @Get()
  findAll() {
    return this.svc.findOperators();
  }

  @Post()
  @ApiBody({
    type: CreateOperatorDto,
    examples: {
      contract: {
        summary: 'Create an operator',
        value: { name: 'MOVA Express', isActive: true },
      },
    },
  })
  create(@Body() dto: CreateOperatorDto) {
    return this.svc.createOperator(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperatorDto,
  ) {
    return this.svc.updateOperator(id, dto);
  }
}
