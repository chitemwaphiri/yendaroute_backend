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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BookingService, AuthUser } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/role.enum';

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(Role.PASSENGER)
  @ApiOperation({ summary: 'Book specific seats (passenger comes from the token)' })
  createBooking(
    @Req() req: { user: AuthUser },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.create(req.user, dto);
  }

  @Get('options/trips')
  @ApiOperation({ summary: 'Dropdown: upcoming trips as { id, label }' })
  @ApiQuery({ name: 'date', required: false, example: '2026-12-15' })
  tripOptions(@Query('date') date?: string) {
    return this.bookingService.tripOptions(date);
  }

  @Get('options/stops')
  @ApiOperation({ summary: 'Dropdown: stops as { id, label }' })
  stopOptions() {
    return this.bookingService.stopOptions();
  }

  @Get('availability')
  @ApiOperation({ summary: 'Taken and free seats for a trip' })
  @ApiQuery({ name: 'tripId', example: 1 })
  checkAvailability(@Query('tripId', ParseIntPipe) tripId: number) {
    return this.bookingService.checkAvailability(tripId);
  }

  @Get('passengers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Passenger count for each trip (admin only)' })
  @ApiQuery({ name: 'date', required: false, example: '2026-12-15' })
  passengersByTrip(@Query('date') date?: string) {
    return this.bookingService.passengersByTrip(date);
  }

  @Get()
  @ApiOperation({ summary: 'My bookings (admins see all)' })
  getBookings(@Req() req: { user: AuthUser }) {
    return this.bookingService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One booking (only yours, unless admin)' })
  getBooking(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingService.findOne(req.user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (only yours, unless admin)' })
  cancelBooking(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingService.cancel(req.user, id);
  }
}