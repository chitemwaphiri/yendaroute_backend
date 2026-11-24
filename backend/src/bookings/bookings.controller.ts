import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PassengerDetailsDto } from './dto/passenger-details.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverGuard } from '../auth/guards/driver.guard';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post('bookings')
  @ApiOperation({
    summary: 'Start a booking: holds the seats and returns a draft with a reference',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Use the same key when retrying a booking to avoid creating duplicate bookings.',
  })
  @ApiResponse({ status: 201, description: 'Draft booking created, seats held' })
  @ApiResponse({ status: 400, description: 'Past date, trip does not run that day, seat or stop invalid, or no fare set' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  @ApiResponse({ status: 409, description: 'A seat is already taken' })
  create(
    @Req() req: any,
    @Body() dto: CreateBookingDto,
  ) {
    const idempotencyKey = req.headers['idempotency-key'];

    return this.svc.create(req.user.userId, dto, idempotencyKey);
  }

  @Get('me/bookings')
  @ApiOperation({ summary: 'My bookings (newest first)' })
  findMine(@Req() req: any, @Query() q: QueryBookingsDto) {
    return this.svc.findMine(req.user.userId, q);
  }

  // Keep this before bookings/:reference
  @UseGuards(DriverGuard)
  @Get('bookings/driver/:scheduleId')
  @ApiOperation({
    summary: 'Passenger manifest, vehicle and upcoming stops for a trip (driver only)',
  })
  @ApiQuery({
    name: 'travelDate',
    example: '2026-12-25',
    required: true,
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    example: -13.9626,
    description: 'Current GPS latitude of the driver',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    example: 33.7741,
    description: 'Current GPS longitude of the driver',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not the driver of this trip',
  })
  getDriverManifest(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Query('travelDate') travelDate: string,
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Req() req: any,
  ) {
    return this.svc.getDriverManifest(
      scheduleId,
      travelDate,
      req.user.userId,
      latitude === undefined ? undefined : Number(latitude),
      longitude === undefined ? undefined : Number(longitude),
    );
  }

  @Get('bookings/:reference')
  @ApiOperation({ summary: 'One booking by reference (owner or admin)' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('reference') reference: string, @Req() req: any) {
    return this.svc.findByReference(reference, req.user);
  }

  @Patch('bookings/:reference/passenger')
  @ApiOperation({ summary: 'Save passenger details; the booking becomes "reviewed"' })
  @ApiResponse({ status: 400, description: 'Validation failed, or the hold expired' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  updatePassenger(
    @Param('reference') reference: string,
    @Req() req: any,
    @Body() dto: PassengerDetailsDto,
  ) {
    return this.svc.updatePassenger(reference, req.user.userId, dto);
  }

  @Post('bookings/:reference/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a booking before departure and free its seats' })
  @ApiResponse({ status: 400, description: 'Already cancelled, expired or departed' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  cancel(@Param('reference') reference: string, @Req() req: any) {
    return this.svc.cancel(reference, req.user);
  }
}