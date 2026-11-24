import { BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpErrorFilter } from './http-error.filter';

describe('HttpErrorFilter', () => {
  it('uses the frontend error response shape', () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      headers: { 'x-request-id': 'request-1' },
      method: 'POST',
      url: '/api/v1/bookings',
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };

    new HttpErrorFilter().catch(
      new BadRequestException('Invalid booking details'),
      host as any,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Invalid booking details',
    });
  });
});
