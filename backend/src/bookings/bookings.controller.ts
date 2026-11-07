import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverGuard } from '../auth/guards/driver.guard';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Get()
  findMyBookings(@Req() req: any) {
    return this.svc.findMyBookings(req.user.userId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.cancelBooking(id, req.user.userId);
  }

  // Driver Manifest Endpoint
  @UseGuards(DriverGuard) 
  @Get('driver/manifest/:scheduleId')
  getDriverManifest(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Query('travelDate') travelDate: string,
    @Req() req: any,
  ) {
    return this.svc.getDriverManifest(scheduleId, travelDate, req.user.userId);
  }
}