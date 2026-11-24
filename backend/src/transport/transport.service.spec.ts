import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Operator } from './entities/operator.entity';
import { Vehicle } from './entities/vehicle.entity';
import { TransportService } from './transport.service';

describe('TransportService', () => {
  const vehiclesRepository = {
    create: jest.fn((vehicle) => vehicle),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  let service: TransportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    vehiclesRepository.save.mockImplementation(async (vehicle) => ({
      id: 1,
      ...vehicle,
    }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransportService,
        { provide: getRepositoryToken(Vehicle), useValue: vehiclesRepository },
        { provide: getRepositoryToken(Schedule), useValue: {} },
        { provide: getRepositoryToken(Fare), useValue: {} },
        { provide: getRepositoryToken(Booking), useValue: {} },
        { provide: getRepositoryToken(Operator), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(TransportService);
  });

  it('creates and serializes a vehicle using frontend contract fields', async () => {
    await expect(
      service.create({
        name: 'MOVA 1',
        registrationNumber: 'BA 1234',
        type: 'Bus',
        seatCapacity: 42,
        isActive: true,
      }),
    ).resolves.toEqual({
      id: '1',
      name: 'MOVA 1',
      registrationNumber: 'BA 1234',
      type: 'Bus',
      seatCapacity: 42,
      isActive: true,
    });

    expect(vehiclesRepository.create).toHaveBeenCalledWith({
      name: 'MOVA 1',
      plateNumber: 'BA 1234',
      vehicleType: 'Bus',
      capacity: 42,
      isActive: true,
    });
  });
});
