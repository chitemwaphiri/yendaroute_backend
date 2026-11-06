import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BookingsService, AuthUser } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';

interface AuthedRequest {
  user: AuthUser;
}

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Book specific seats (passenger comes from the token)' })
  create(@Req() req: AuthedRequest, @Body() dto: CreateBookingDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Get('options/schedules')
  @ApiOperation({ summary: 'Dropdown: schedules as { id, label }' })
  @ApiQuery({ name: 'date', required: false, example: '2026-12-15' })
  scheduleOptions(@Query('date') date?: string) {
    return this.svc.scheduleOptions(date);
  }

  @Get('options/stops')
  @ApiOperation({ summary: 'Dropdown: stops as { id, label }' })
  stopOptions() {
    return this.svc.stopOptions();
  }

  @Get('options/routes')
  @ApiOperation({ summary: 'Dropdown: routes as { id, label }' })
  routeOptions() {
    return this.svc.routeOptions();
  }

  @Get('availability')
  @ApiOperation({ summary: 'Taken and free seats for a schedule on a date' })
  @ApiQuery({ name: 'scheduleId', example: 1 })
  @ApiQuery({ name: 'travelDate', example: '2026-12-15' })
  availability(
    @Query('scheduleId', ParseIntPipe) scheduleId: number,
    @Query('travelDate') travelDate: string,
  ) {
    return this.svc.availability(scheduleId, travelDate);
  }

  @Get('passengers')
  @UseGuards(StaffGuard)
  @ApiOperation({ summary: 'Passenger count per trip (admin: all, driver: own trips)' })
  @ApiQuery({ name: 'date', required: false, example: '2026-12-15' })
  passengers(@Req() req: AuthedRequest, @Query('date') date?: string) {
    return this.svc.passengersBySchedule(req.user, date);
  }

  @Get()
  @ApiOperation({ summary: 'My bookings (admins see all)' })
  @ApiQuery({ name: 'status', required: false, example: 'confirmed' })
  findAll(@Req() req: AuthedRequest, @Query('status') status?: string) {
    return this.svc.findAll(req.user, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One booking (only yours, unless admin)' })
  findOne(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id, req.user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (only yours, unless admin)' })
  cancel(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.svc.cancel(id, req.user);
  }
}