import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomUUID, timingSafeEqual } from 'crypto';

import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,

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

  async createPayment(
    reference: string,
    userId: number,
    dto: CreatePaymentDto,
  ) {
    const booking = await this.bookingsRepository.findOne({
      where: { reference },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('This booking does not belong to you');
    }

    if (booking.status !== ('reviewed' as any)) {
      throw new BadRequestException(
        'Only reviewed bookings can be paid for',
      );
    }

    const existingPayment = await this.paymentsRepository.findOne({
      where: {
        bookingReference: reference,
        status: PaymentStatus.SUCCESSFUL,
      },
    });

    if (existingPayment) {
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
      currency: 'MWK',
      method: dto.method,
      provider: 'simulated',
      status: PaymentStatus.PENDING,
      transactionReference: randomUUID(),
    });

    const saved = await this.paymentsRepository.save(payment);

    return {
      paymentId: saved.id,
      transactionReference: saved.transactionReference,
      status: saved.status,
      amount: Number(saved.amount),
      currency: saved.currency,
      provider: saved.provider,
      message: 'SIMULATED payment created. No real money charged.',
    };
  }

  async getPayment(paymentId: string, user: any) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      payment.userId !== user.userId &&
      user.role !== 'admin'
    ) {
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

    const expectedSecret =
      this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!expectedSecret) {
      throw new UnauthorizedException(
        'Webhook verification is not configured',
      );
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

    const booking = await this.bookingsRepository.findOne({
      where: { reference: payment.bookingReference },
    });

    if (!booking) {
      throw new NotFoundException('Associated booking not found');
    }

    if (booking.status !== ('reviewed' as any)) {
      throw new ConflictException(
        'Booking is not ready for payment confirmation',
      );
    }

    // The Bookings module must provide confirmPayment(reference).
    // Until then, we must not report a successful payment.
    throw new ConflictException(
      'Waiting for Bookings module payment confirmation integration',
    );
  }
}