import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { BookingSeat } from './entities/booking-seat.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';
import { Fare } from '../fares/entities/fare.entity';

const everyDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const schedule = {
  id: 1,
  routeId: 1,
  isActive: true,
  daysOfWeek: everyDay,
  departureTime: '08:00:00',
  departureStopId: 1,
  vehicle: { capacity: 10 },
};
const routeStops = [
  { stopId: 1, sequence: 1 },
  { stopId: 2, sequence: 2 },
];

describe('BookingsService', () => {
  let service: BookingsService;
  let seatsRepo: { find: jest.Mock };
  let schedulesRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    seatsRepo = { find: jest.fn().mockResolvedValue([]) };
    schedulesRepo = { findOne: jest.fn().mockResolvedValue(schedule) };
    const dataSource = {
      getRepository: jest.fn((entity) =>
        entity === RouteStop
          ? { find: jest.fn().mockResolvedValue(routeStops) }
          : entity === Fare
            ? { findOne: jest.fn().mockResolvedValue({ amount: 1000, currency: 'MWK' }) }
            : {},
      ),
      transaction: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(BookingSeat), useValue: seatsRepo },
        { provide: getRepositoryToken(Schedule), useValue: schedulesRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(BookingsService);
    // The expiry check needs a real query builder, which is not under test here
    jest.spyOn(service as any, 'releaseExpiredHolds').mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a travel date in the past', async () => {
    await expect(
      service.create(1, { scheduleId: 1, travelDate: '2000-01-03', seatNumbers: [1] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a seat number above the vehicle capacity', async () => {
    await expect(
      service.create(1, { scheduleId: 1, travelDate: '2099-01-05', seatNumbers: [11] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a seat that is already taken', async () => {
    seatsRepo.find.mockResolvedValue([{ seatNumber: '3' }]);
    await expect(
      service.create(1, { scheduleId: 1, travelDate: '2099-01-05', seatNumbers: [3] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});