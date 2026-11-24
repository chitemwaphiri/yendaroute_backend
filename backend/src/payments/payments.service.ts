import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { timingSafeEqual } from 'crypto';
import { BookingsService } from '../bookings/bookings.service';

import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    private readonly bookingsService: BookingsService,
    private readonly dataSource: DataSource,

    private readonly notificationsService: NotificationsService,

    private readonly configService: ConfigService,
  ) {}

  getPaymentMethods() {
    return [
      {
        id: PaymentMethod.MOBILE_MONEY,
        name: 'Mobile Money',
        provider: 'simulated',
        description: 'Simulated mobile money payment',
      },
      {
        id: PaymentMethod.BANK_CARD,
        name: 'Bank Card',
        provider: 'simulated',
        description: 'Simulated bank card payment',
      },
    ];
  }

  async recordContractPayment(
    reference: string,
    userId: number,
    dto: CreatePaymentDto,
  ) {
    const existingBooking = await this.bookingsService.findByReference(
      reference,
      {
        userId,
        role: 'passenger',
      },
    );
    const successfulPayment = await this.paymentsRepository.findOne({
      where: { bookingReference: reference, status: PaymentStatus.SUCCESSFUL },
    });
    if (successfulPayment) {
      if (successfulPayment.transactionReference === dto.paymentReference) {
        return existingBooking;
      }
      throw new ConflictException('Booking has already been paid');
    }

    const booking = await this.bookingsService.getForPayment(reference, userId);
    const method =
      dto.paymentMethod === 'Card'
        ? PaymentMethod.BANK_CARD
        : PaymentMethod.MOBILE_MONEY;
    try {
      await this.dataSource.transaction(async (manager) => {
        const currentBooking = await manager
          .createQueryBuilder(Booking, 'booking')
          .setLock('pessimistic_write')
          .where('booking.id = :id', { id: booking.id })
          .getOne();
        if (!currentBooking || currentBooking.status !== BookingStatus.REVIEWED) {
          throw new ConflictException('Booking is no longer ready for payment');
        }
        if (
          !currentBooking.holdExpiresAt ||
          currentBooking.holdExpiresAt.getTime() <= Date.now()
        ) {
          throw new ConflictException('The booking seat hold has expired');
        }
        const priorPayment = await manager.getRepository(Payment).findOne({
          where: { bookingId: booking.id, status: PaymentStatus.SUCCESSFUL },
        });
        if (priorPayment)
          throw new ConflictException('Booking has already been paid');
        const payment = manager.getRepository(Payment).create({
          bookingId: currentBooking.id,
          bookingReference: currentBooking.reference,
          userId,
          amount: Number(currentBooking.fare),
          currency: currentBooking.currency,
          method,
          provider: 'simulated',
          status: PaymentStatus.SUCCESSFUL,
          transactionReference: dto.paymentReference,
          paidAt: new Date(),
        });
        await manager.getRepository(Payment).save(payment);
        await manager.getRepository(Booking).update(currentBooking.id, {
          status: BookingStatus.PAID,
          holdExpiresAt: null,
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Payment reference has already been used');
      }
      throw error;
    }
    await this.notifyPaymentCompleted(userId, booking.fare, method);
    return this.bookingsService.findByReference(reference, {
      userId,
      role: 'passenger',
    });
  }

  async createPayment(
    reference: string,
    userId: number,
    dto: CreatePaymentDto,
  ) {
    // Checks the owner, that the booking is 'reviewed', and that the hold has not expired
    const booking = await this.bookingsService.getForPayment(reference, userId);

    const existingPayment = await this.paymentsRepository.findOne({
      where: { transactionReference: dto.paymentReference },
    });
    if (existingPayment) {
      if (
        existingPayment.bookingId === booking.id &&
        existingPayment.userId === userId &&
        existingPayment.method ===
          (dto.paymentMethod === 'Card'
            ? PaymentMethod.BANK_CARD
            : PaymentMethod.MOBILE_MONEY) &&
        existingPayment.status === PaymentStatus.PENDING
      ) {
        return this.paymentResponse(existingPayment);
      }
      throw new ConflictException('Payment reference has already been used');
    }

    const successfulPayment = await this.paymentsRepository.findOne({
      where: { bookingReference: reference, status: PaymentStatus.SUCCESSFUL },
    });
    if (successfulPayment) {
      throw new ConflictException('Booking has already been paid');
    }

    const amount = Number(booking.fare);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid booking fare');
    }

    const payment = this.paymentsRepository.create({
      bookingId: booking.id,
      bookingReference: booking.reference,
      userId,
      amount,
      currency: booking.currency,
      method:
        dto.paymentMethod === 'Card'
          ? PaymentMethod.BANK_CARD
          : PaymentMethod.MOBILE_MONEY,
      provider: 'simulated',
      status: PaymentStatus.PENDING,
      transactionReference: dto.paymentReference,
    });

    let saved: Payment;
    try {
      saved = await this.paymentsRepository.save(payment);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Payment reference has already been used');
      }
      throw error;
    }

    return this.paymentResponse(saved);
  }

  private paymentResponse(payment: Payment) {
    return {
      paymentId: payment.id,
      transactionReference: payment.transactionReference,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
      message: 'SIMULATED payment created. No real money charged.',
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      error.driverError?.code === '23505'
    );
  }

  async getPayment(paymentId: string, user: any) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== user.userId && user.role !== 'admin') {
      throw new ForbiddenException(
        'You cannot view another passenger’s payment',
      );
    }

    return {
      paymentId: payment.id,
      bookingReference: payment.bookingReference,
      amount: Number(payment.amount),
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      status: payment.status,
      createdAt: payment.createdAt,
    };
  }

  async handleWebhook(
    provider: string,
    secret: string | undefined,
    body: {
      transactionReference?: string;
      bookingReference?: string;
      amount?: number;
      status?: string;
    },
  ) {
    if (provider !== 'simulated') {
      throw new BadRequestException('Unsupported payment provider');
    }

    const expectedSecret = this.configService.get<string>(
      'PAYMENT_WEBHOOK_SECRET',
    );

    if (!expectedSecret) {
      throw new UnauthorizedException('Webhook verification is not configured');
    }

    const supplied = Buffer.from(secret ?? '');
    const expected = Buffer.from(expectedSecret);

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    if (
      !body ||
      typeof body.transactionReference !== 'string' ||
      typeof body.bookingReference !== 'string' ||
      typeof body.amount !== 'number' ||
      !Number.isFinite(body.amount)
    ) {
      throw new BadRequestException('Invalid webhook payload');
    }

    if (body.status !== 'successful') {
      throw new BadRequestException('Unsupported payment status');
    }

    const payment = await this.paymentsRepository.findOne({
      where: {
        transactionReference: body.transactionReference,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      payment.bookingReference !== body.bookingReference ||
      Number(payment.amount) !== body.amount
    ) {
      throw new BadRequestException(
        'Payment reference or amount does not match',
      );
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      return {
        paymentId: payment.id,
        status: payment.status,
        message: 'Payment already processed',
      };
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(Payment);
      const currentPayment = await manager
        .createQueryBuilder(Payment, 'payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id: payment.id })
        .getOne();
      if (!currentPayment) throw new NotFoundException('Payment not found');
      if (currentPayment.status === PaymentStatus.SUCCESSFUL) {
        return {
          alreadyProcessed: true,
          userId: currentPayment.userId,
          method: currentPayment.method,
        };
      }
      const bookings = manager.getRepository(Booking);
      const booking = await manager
        .createQueryBuilder(Booking, 'booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id: currentPayment.bookingId })
        .getOne();
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== BookingStatus.REVIEWED) {
        throw new ConflictException(
          `A '${booking.status}' booking cannot be paid`,
        );
      }
      if (
        !booking.holdExpiresAt ||
        booking.holdExpiresAt.getTime() <= Date.now()
      ) {
        throw new ConflictException('The booking seat hold has expired');
      }
      currentPayment.status = PaymentStatus.SUCCESSFUL;
      currentPayment.paidAt = new Date();
      await payments.save(currentPayment);
      await bookings.update(booking.id, {
        status: BookingStatus.PAID,
        holdExpiresAt: null,
      });
      return {
        alreadyProcessed: false,
        userId: booking.userId,
        method: currentPayment.method,
      };
    });
    if (!result.alreadyProcessed) {
      await this.notifyPaymentCompleted(
        result.userId,
        payment.amount,
        result.method,
      );
    }

    return {
      paymentId: payment.id,
      status: PaymentStatus.SUCCESSFUL,
      message: result.alreadyProcessed
        ? 'Payment already processed'
        : 'Payment confirmed',
    };
  }

  private async notifyPaymentCompleted(
    userId: number,
    amount: number,
    method: PaymentMethod,
  ) {
    try {
      await this.notificationsService.create(
        userId,
        'Payment completed',
        `Your payment of MWK ${Number(amount)} via ${method === PaymentMethod.MOBILE_MONEY ? 'MobileMoney' : 'Card'} is complete.`,
      );
    } catch (error) {
      this.logger.error(
        'Payment succeeded, but its notification could not be created',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
