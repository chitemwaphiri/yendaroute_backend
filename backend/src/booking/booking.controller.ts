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

import { ApiBody } from '@nestjs/swagger';
import { BookingService } from './booking.service';

@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
  ) {}

  // CREATE BOOKING
  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'passengerName',
        'phoneNumber',
        'tripId',
        'travelDate',
        'seatsBooked',
      ],
      properties: {
        passengerName: {
          type: 'string',
          example: 'John Banda',
        },
        phoneNumber: {
          type: 'string',
          example: '0999123456',
        },
        tripId: {
          type: 'integer',
          example: 1,
        },
        travelDate: {
          type: 'string',
          example: '2026-10-25',
        },
        seatsBooked: {
          type: 'integer',
          example: 1,
        },
      },
    },
  })
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

  // GET ALL BOOKINGS
  @Get()
  getAllBookings() {
    return this.bookingService.findAll();
  }

  // CHECK SEAT AVAILABILITY
  @Get('availability')
  checkAvailability(
    @Query('tripId', ParseIntPipe) tripId: number,
    @Query('travelDate') travelDate: string,
  ) {
    if (!travelDate) {
      throw new BadRequestException('Travel date is required');
    }

    return this.bookingService.checkAvailability(
      tripId,
      travelDate,
    );
  }

  // GET BOOKING BY ID
  @Get(':id')
  getBooking(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingService.findOne(id);
  }

  // CANCEL BOOKING
  @Patch(':id/cancel')
  cancelBooking(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingService.cancel(id);
  }
}