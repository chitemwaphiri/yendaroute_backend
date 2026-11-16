import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/v1/admin/bookings')
export class AdminBookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'All bookings (admin), filter by status, schedule and date' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  findAll(@Query() q: QueryBookingsDto) {
    return this.svc.findAllForAdmin(q);
  }

  @Get(':reference')
  @ApiOperation({ summary: 'One booking by reference (admin), with the passenger account' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('reference') reference: string) {
    return this.svc.findOneForAdmin(reference);
  }
}