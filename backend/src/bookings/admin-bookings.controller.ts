import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/v1')
export class AdminBookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Get('bookings/admin/list')
  @ApiOperation({ summary: 'Admin: list all bookings at the frontend contract path' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  findAll(@Query() q: QueryBookingsDto) {
    return this.svc.findAllForAdmin(q);
  }
}