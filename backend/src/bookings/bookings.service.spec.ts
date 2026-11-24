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
import { Payment } from '../payments/entities/payment.entity';

const everyDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const schedule = {
  id: 1,
  routeId: 1,
  isActive: true,
  daysOfWeek: everyDay,
  serviceDate: null,
  departureTime: '08:00:00',
  departureStopId: 1,
  totalSeats: 10,
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
  let bookingsRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };
  let paymentsRepo: { findOne: jest.Mock };
  let dataSource: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    seatsRepo = { find: jest.fn().mockResolvedValue([]) };
    schedulesRepo = { findOne: jest.fn().mockResolvedValue(schedule) };
    bookingsRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    paymentsRepo = { findOne: jest.fn().mockResolvedValue(null) };
    dataSource = {
      getRepository: jest.fn((entity) =>
        entity === RouteStop
          ? { find: jest.fn().mockResolvedValue(routeStops) }
          : entity === Fare
            ? {
                findOne: jest
                  .fn()
                  .mockResolvedValue({ amount: 1000, currency: 'MWK' }),
              }
            : {},
      ),
      transaction: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingsRepo },
        { provide: getRepositoryToken(BookingSeat), useValue: seatsRepo },
        { provide: getRepositoryToken(Schedule), useValue: schedulesRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(BookingsService);
    // The expiry check needs a real query builder, which is not under test here
    jest
      .spyOn(service as any, 'releaseExpiredHolds')
      .mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a travel date in the past', async () => {
    schedulesRepo.findOne.mockResolvedValue({
      ...schedule,
      serviceDate: '2000-01-03',
    });
    await expect(
      service.create(1, { tripId: '1', selectedSeats: [1] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves a TRIP-prefixed public ID to its numeric schedule key', async () => {
    schedulesRepo.findOne.mockResolvedValue({
      ...schedule,
      serviceDate: '2000-01-03',
    });

    await expect(
      service.create(1, { tripId: 'TRIP001', selectedSeats: [1] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(schedulesRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('rejects a seat number above the vehicle capacity', async () => {
    schedulesRepo.findOne.mockResolvedValue({
      ...schedule,
      serviceDate: '2099-01-05',
    });
    await expect(
      service.create(1, { tripId: '1', selectedSeats: [11] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a seat that is already taken', async () => {
    schedulesRepo.findOne.mockResolvedValue({
      ...schedule,
      serviceDate: '2099-01-05',
    });
    seatsRepo.find.mockResolvedValue([{ seatNumber: 3 }]);
    await expect(
      service.create(1, { tripId: '1', selectedSeats: [3] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not confirm a booking before it is paid', async () => {
    const booking = {
      id: 12,
      reference: 'YR12',
      userId: 1,
      status: 'reviewed',
    };
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(booking),
    };
    const repository = { update: jest.fn() };
    dataSource.transaction.mockImplementation((work) =>
      work({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        getRepository: jest.fn().mockReturnValue(repository),
      }),
    );

    await expect(service.confirmPayment('YR12')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('serializes a booking with its successful payment and held seats', async () => {
    const booking = {
      id: 12,
      reference: 'YR12',
      scheduleId: 3,
      travelDate: '2099-01-05',
      status: 'paid',
      fare: 2000,
      currency: 'MWK',
      holdExpiresAt: null,
      seats: [{ seatNumber: 4, active: true }],
      passengerName: 'Ada Passenger',
      passengerEmail: 'ada@example.com',
      phoneNumber: '+265999000111',
      identificationNumber: 'ID-12',
      originStop: { name: 'Zomba' },
      destinationStop: { name: 'Mzuzu' },
      schedule: {
        id: 3,
        departureTime: '08:00:00',
        arrivalAt: '12:30:00',
        arrivalDate: '2099-01-05',
        totalSeats: 10,
        vehicle: { capacity: 10 },
        route: { roadName: 'M1', companyName: 'YendaRoute Ltd' },
      },
    };
    bookingsRepo.find.mockResolvedValue([booking]);
    paymentsRepo.findOne.mockResolvedValue({
      method: 'mobile_money',
      transactionReference: 'MPAY-12',
      amount: 2000,
      currency: 'MWK',
      paidAt: new Date('2099-01-01T00:00:00Z'),
    });

    const result = await service.toDto(booking as any);

    expect(result).toMatchObject({
      tripId: '3',
      selectedSeats: [4],
      paymentMethod: 'MobileMoney',
      paymentReference: 'MPAY-12',
      payment: {
        method: 'MobileMoney',
        reference: 'MPAY-12',
        amount: 2000,
        currency: 'MWK',
        status: 'paid',
      },
      schedule: {
        id: '3',
        origin: 'Zomba',
        destination: 'Mzuzu',
        bookedSeats: [4],
        routeName: 'M1',
        operatorName: 'YendaRoute Ltd',
      },
    });
    expect(result).not.toHaveProperty('scheduleId');
    expect(result).not.toHaveProperty('seatNumbers');
  });
});
