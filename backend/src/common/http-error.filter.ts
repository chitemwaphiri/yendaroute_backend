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

const CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

/**
 * Every error leaves the API in one shape:
 * { error: { code, message, details?, requestId } }
 */
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
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as { message?: string | string[]; details?: unknown };
        if (Array.isArray(b.message)) {
          message = 'Validation failed';
          details = b.message;
        } else {
          message = b.message ?? exception.message;
        }
        if (b.details) details = b.details;
      }
    } else {
      // Unexpected error: log the real cause, but never show it to the app
      this.logger.error(
        `[${requestId}] ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const code =
      details && status === 400
        ? 'VALIDATION_ERROR'
        : (CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'));

    res.setHeader('x-request-id', requestId);
    res.status(status).json({
      error: { code, message, ...(details ? { details } : {}), requestId },
    });
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