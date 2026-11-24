import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Fare } from '../fares/entities/fare.entity';
import { FaresService } from '../fares/fares.service';
import { Operator } from '../transport/entities/operator.entity';
import { Route } from '../routes/entities/route.entity';
import { Schedule } from './entities/schedule.entity';
import { SchedulesService } from './schedules.service';
import { Stop } from '../stops/entities/stop.entity';
import { Vehicle } from '../transport/entities/vehicle.entity';

describe('SchedulesService', () => {
  const travelDate = '2099-01-05';
  const schedulesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const routesRepository = {
    findOne: jest.fn(),
  };
  const bookingsRepository = {
    find: jest.fn(),
  };
  const faresRepository = {
    findOne: jest.fn(),
  };
  const vehiclesRepository = {
    findOne: jest.fn(),
  };
  const operatorsRepository = {
    findOne: jest.fn(),
  };
  const faresService = {
    fareBetween: jest.fn(),
  };
  let service: SchedulesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    schedulesRepository.create.mockImplementation((value) => value);
    schedulesRepository.save.mockImplementation((value) =>
      Promise.resolve({ ...value, id: 1 }),
    );
    schedulesRepository.findOne.mockResolvedValue({
      id: 1,
      serviceDate: travelDate,
      daysOfWeek: ['MON'],
      totalSeats: 5,
      vehicle: { capacity: 5 },
    });
    routesRepository.findOne.mockResolvedValue(null);
    bookingsRepository.find.mockResolvedValue([]);
    faresRepository.findOne.mockResolvedValue(null);
    vehiclesRepository.findOne.mockResolvedValue(null);
    operatorsRepository.findOne.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: schedulesRepository,
        },
        { provide: getRepositoryToken(Route), useValue: routesRepository },
        { provide: getRepositoryToken(Stop), useValue: {} },
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
        { provide: getRepositoryToken(Fare), useValue: faresRepository },
        { provide: getRepositoryToken(Vehicle), useValue: vehiclesRepository },
        {
          provide: getRepositoryToken(Operator),
          useValue: operatorsRepository,
        },
        { provide: FaresService, useValue: faresService },
      ],
    }).compile();

    service = moduleRef.get(SchedulesService);
  });

  it('reloads a saved schedule with its route before formatting it', async () => {
    const route = {
      id: 3,
      originStopId: 10,
      destinationStopId: 11,
      roadName: 'M1',
      companyName: 'MOVA Express',
      originStop: { id: 10, name: 'Lilongwe' },
      destinationStop: { id: 11, name: 'Blantyre' },
      routeStops: [],
    };
    const loadedSchedule = {
      id: 21,
      routeId: route.id,
      route,
      serviceDate: '2099-01-05',
      arrivalDate: '2099-01-05',
      departureTime: '07:00:00',
      arrivalAt: '12:00:00',
      fare: 75000,
      currency: 'MWK',
      totalSeats: 42,
      daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      isActive: true,
      vehicle: { id: 4, name: 'MOVA 1', capacity: 42, vehicleType: 'Bus' },
    };
    routesRepository.findOne.mockResolvedValue(route);
    vehiclesRepository.findOne.mockResolvedValue(loadedSchedule.vehicle);
    schedulesRepository.save.mockResolvedValue({ id: loadedSchedule.id });
    schedulesRepository.findOne.mockResolvedValue(loadedSchedule);

    const result = await service.create({
      routeId: route.id,
      origin: 'Lilongwe',
      destination: 'Blantyre',
      departureTime: '2099-01-05T07:00:00Z',
      arrivalTime: '2099-01-05T12:00:00Z',
      fare: 75000,
      currency: 'MWK',
      totalSeats: 42,
      operatorName: 'MOVA Express',
      routeName: 'M1',
      vehicleName: 'MOVA 1',
      transportMode: 'Bus',
    });

    expect(schedulesRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: loadedSchedule.id } }),
    );
    expect(faresRepository.findOne).toHaveBeenCalledWith({
      where: {
        routeId: route.id,
        originStopId: route.originStopId,
        destinationStopId: route.destinationStopId,
      },
    });
    expect(result).toMatchObject({
      id: String(loadedSchedule.id),
      origin: 'Lilongwe',
      destination: 'Blantyre',
      departureTime: '2099-01-05T07:00:00.000Z',
      arrivalTime: '2099-01-05T12:00:00.000Z',
    });
  });

  it('counts active holds and paid seats against the same capacity', async () => {
    bookingsRepository.find.mockResolvedValue([
      {
        status: BookingStatus.DRAFT,
        holdExpiresAt: new Date(Date.now() + 60_000),
        seats: [{ seatNumber: 2, active: true }],
      },
      {
        status: BookingStatus.REVIEWED,
        holdExpiresAt: new Date(Date.now() - 60_000),
        seats: [{ seatNumber: 4, active: true }],
      },
      {
        status: BookingStatus.PAID,
        holdExpiresAt: null,
        seats: [{ seatNumber: 3, active: true }],
      },
    ]);

    await expect(service.getSeats(1, travelDate)).resolves.toEqual({
      scheduleId: '1',
      totalSeats: 5,
      bookedSeats: [2, 3],
      availableSeats: [1, 4, 5],
    });
  });
});
