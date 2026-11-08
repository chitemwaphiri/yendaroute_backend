import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  // Create a notification for a passenger
  async create(
    userId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      title,
      message,
      isRead: false,
    });

    return this.notificationsRepository.save(notification);
  }

  // Retrieve a passenger's notifications
  async findAll(
    userId: number,
    unreadOnly = false,
    page = 1,
    pageSize = 10,
  ) {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));

    const [items, total] =
      await this.notificationsRepository.findAndCount({
        where: {
          userId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        order: { createdAt: 'DESC' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      });

    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
    };
  }

  // Count unread notifications
  async getUnreadCount(userId: number) {
    const count = await this.notificationsRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  // Mark a notification as read
  async markAsRead(
    userId: number,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;

    return this.notificationsRepository.save(notification);
  }
}