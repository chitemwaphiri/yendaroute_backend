import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';

import { BookingService } from './booking.service';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  createBooking(
    @Body()
    data: {
      passengerName: string;
      phoneNumber: string;
      tripId: number;
      travelDate: string;
      seatsBooked: number;
    },
  ) {
    return this.bookingService.create(data);
  }

  @Get()
  getAllBookings() {
    return this.bookingService.findAll();
  }

  @Get('availability')
  checkAvailability(
    @Query('tripId', ParseIntPipe) tripId: number,
    @Query('travelDate') travelDate: string,
  ) {
    if (!travelDate) {
      throw new BadRequestException('Travel date is required');
    }

    return this.bookingService.checkAvailability(tripId, travelDate);
  }

  @Get(':id')
  getBooking(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.findOne(id);
  }

  @Patch(':id/cancel')
  cancelBooking(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.cancel(id);
  }
}