import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpErrorFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as {
          message?: string | string[];
          details?: Record<string, string[]>;
        };
        message = Array.isArray(b.message)
          ? b.message.join('; ')
          : (b.message ?? exception.message);
        // Include field-level validation details when present
        if (b.details) {
          message = `${message}: ${Object.entries(b.details)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ')}`;
        }
      }
    } else {
      this.logger.error(
        `[${requestId}] ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.setHeader('x-request-id', requestId);
    res.status(status).json({
      statusCode: status,
      error: this.statusText(status),
      message,
    });
  }

  private statusText(status: number) {
    const words = HttpStatus[status]?.toLowerCase().replace(/_/g, ' ');
    return words
      ? words.replace(/\b\w/g, (letter) => letter.toUpperCase())
      : 'Error';
  }
}

/**
 * Turns class-validator errors into { field: ["message", ...] }
 * Use it in the ValidationPipe (see main.ts).
 */
export function validationExceptionFactory(errors: ValidationError[]) {
  const details: Record<string, string[]> = {};
  const walk = (list: ValidationError[], prefix = '') => {
    for (const e of list) {
      const path = prefix ? `${prefix}.${e.property}` : e.property;
      if (e.constraints) details[path] = Object.values(e.constraints);
      if (e.children?.length) walk(e.children, path);
    }
  };
  walk(errors);
  return new BadRequestException({ message: 'Validation failed', details });
}
