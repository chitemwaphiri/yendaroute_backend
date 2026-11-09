import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('payment-methods')
  @ApiOperation({
    summary: 'List supported simulated payment methods',
  })
  getPaymentMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  @Post('bookings/:reference/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a simulated payment for a reviewed booking',
  })
  createPayment(
    @Param('reference') reference: string,
    @Req() req: any,
    @Body(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }))
    dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      reference,
      req.user.userId,
      dto,
    );
  }

  @Get('payments/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get payment status',
  })
  getPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Req() req: any,
  ) {
    return this.paymentsService.getPayment(
      paymentId,
      req.user,
    );
  }

  @Post('payments/webhooks/:provider')
  @ApiOperation({
    summary: 'Receive a verified simulated payment webhook',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'transactionReference',
        'bookingReference',
        'amount',
        'status',
      ],
      properties: {
        transactionReference: {
          type: 'string',
        },
        bookingReference: {
          type: 'string',
          example: 'YR123',
        },
        amount: {
          type: 'number',
          example: 15000,
        },
        status: {
          type: 'string',
          example: 'successful',
        },
      },
    },
  })
  handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string,
    @Body() body: any,
  ) {
    return this.paymentsService.handleWebhook(
      provider,
      secret,
      body,
    );
  }
}