import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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
import { PassengerGuard } from '../auth/guards/passenger.guard';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post('bookings')
  @UseGuards(PassengerGuard)
  @ApiOperation({
    summary:
      'Start a booking: holds the seats and returns a draft with a reference',
  })
  @ApiBody({
    type: CreateBookingDto,
    examples: {
      contract: {
        summary: 'Reserve seats on a schedule',
        value: { tripId: '1', selectedSeats: [1, 2] },
      },
    },
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Send the same value when retrying, so the booking is only made once',
  })
  @ApiResponse({
    status: 201,
    description: 'Draft booking created, seats held',
  })
  @ApiResponse({
    status: 400,
    description:
      'Past date, trip does not run that day, seat or stop invalid, or no fare set',
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  @ApiResponse({ status: 409, description: 'A seat is already taken' })
  create(
    @Req() req: any,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.svc.create(req.user.userId, dto, idempotencyKey);
  }

  @Get('bookings/mine')
  @UseGuards(PassengerGuard)
  @ApiOperation({ summary: 'My bookings (newest first)' })
  findMine(@Req() req: any, @Query() q: QueryBookingsDto) {
    return this.svc.findMine(req.user.userId, q);
  }

  @Get('bookings/:reference')
  @ApiOperation({ summary: 'One booking by reference (owner or admin)' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('reference') reference: string, @Req() req: any) {
    return this.svc.findByReference(reference, req.user);
  }

  @Patch('bookings/:reference')
  @UseGuards(PassengerGuard)
  @ApiOperation({
    summary: 'Save passenger details; the booking becomes "reviewed"',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, or the hold expired',
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  updatePassenger(
    @Param('reference') reference: string,
    @Req() req: any,
    @Body() dto: PassengerDetailsDto,
  ) {
    return this.svc.updatePassenger(reference, req.user.userId, dto);
  }

  @Post('bookings/:reference/confirm')
  @HttpCode(200)
  confirm(@Param('reference') reference: string, @Req() req: any) {
    return this.svc.confirmPayment(reference, req.user);
  }

  @Post('bookings/:reference/cancel')
  @HttpCode(200)
  @UseGuards(PassengerGuard)
  @ApiOperation({
    summary: 'Cancel a booking before departure and free its seats',
  })
  @ApiResponse({
    status: 400,
    description: 'Already cancelled, expired or departed',
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  cancel(@Param('reference') reference: string, @Req() req: any) {
    return this.svc.cancel(reference, req.user);
  }
}
