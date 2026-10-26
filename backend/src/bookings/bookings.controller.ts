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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Bookings')
@ApiBearerAuth('access-token') // <--- FIX
@UseGuards(JwtAuthGuard) // All booking routes require login
@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.svc.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('status') status?: string) {
    return this.svc.findAll(req.user, status);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id, req.user);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.svc.cancel(id, req.user);
  }
}