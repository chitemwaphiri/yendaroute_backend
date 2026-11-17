import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverGuard } from '../auth/guards/driver.guard';

describe('BookingsController', () => {
  let controller: BookingsController;
  const svc = { create: jest.fn().mockResolvedValue({ reference: 'BKG-TEST' }) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: svc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(DriverGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the idempotency key to the service', async () => {
    const dto = { scheduleId: 1, travelDate: '2099-01-05', seatNumbers: [1] };
    await controller.create({ user: { userId: 7 } }, dto, 'key-1');
    expect(svc.create).toHaveBeenCalledWith(7, dto, 'key-1');
  });
});