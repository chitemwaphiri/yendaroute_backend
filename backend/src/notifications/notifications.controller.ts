import {
  Controller,
  Get,
  Patch,
  Delete,
  HttpCode,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get passenger notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationsService.findAll(
      req.user.userId,
      unreadOnly === 'true',
      page === undefined ? 1 : Number(page),
      pageSize === undefined ? 10 : Number(pageSize),
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications' })
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(
    @Req() req: any,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.markAsRead(
      req.user.userId,
      notificationId,
    );
  }

  @Delete(':notificationId')
  @HttpCode(204)
  delete(
    @Req() req: any,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.delete(req.user.userId, notificationId);
  }
}
