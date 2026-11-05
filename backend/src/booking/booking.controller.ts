import {
  BadRequestException,
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
  @ApiOperation({ summary: 'Book specific seats (passenger from the token)' })
  createBooking(
    @Req() req: { user: AuthUser },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.create(req.user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My bookings (admins see all)' })
  getBookings(@Req() req: { user: AuthUser }) {
    return this.bookingService.findAll(req.user);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Taken and free seats for a trip on a date' })
  @ApiQuery({ name: 'tripId', example: 1 })
  @ApiQuery({ name: 'travelDate', example: '2026-11-25' })
  checkAvailability(
    @Query('tripId', ParseIntPipe) tripId: number,
    @Query('travelDate') travelDate: string,
  ) {
    if (!travelDate) {
      throw new BadRequestException('Travel date is required');
    }
    return this.bookingService.checkAvailability(tripId, travelDate);
  }

  @Get('passengers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Passenger count per trip on a date (admin only)' })
  @ApiQuery({ name: 'travelDate', example: '2026-11-25' })
  passengersByTrip(@Query('travelDate') travelDate: string) {
    if (!travelDate) {
      throw new BadRequestException('Travel date is required');
    }
    return this.bookingService.passengersByTrip(travelDate);
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