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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin schedules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/v1/schedules')
export class AdminSchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  @Get('admin/list')
  findAll() {
    return this.svc.findAdminAll();
  }

  @Post()
  @ApiBody({
    type: CreateScheduleDto,
    examples: {
      contract: {
        summary: 'Create a schedule',
        value: {
          origin: 'Lilongwe',
          destination: 'Blantyre',
          departureTime: '2026-11-23T07:00:00Z',
          arrivalTime: '2026-11-23T12:00:00Z',
          fare: 75000,
          currency: 'MWK',
          totalSeats: 42,
          operatorName: 'MOVA Express',
          routeName: 'M1',
          vehicleName: 'MOVA 1',
          transportMode: 'Bus',
        },
      },
    },
  })
  create(@Body() dto: CreateScheduleDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
