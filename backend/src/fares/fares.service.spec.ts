import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Fare } from './entities/fare.entity';
import { FaresService } from './fares.service';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/route-stop.entity';

describe('FaresService', () => {
  const faresRepository = {
    findOne: jest.fn(),
  };
  const routeStopsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  let service: FaresService;

  beforeEach(async () => {
    jest.clearAllMocks();
    routeStopsRepository.findOne.mockImplementation(({ where }) =>
      Promise.resolve(
        [
          { routeId: 1, stopId: 1, sequence: 1 },
          { routeId: 1, stopId: 2, sequence: 2 },
          { routeId: 1, stopId: 3, sequence: 3 },
        ].find((stop) => stop.stopId === where.stopId) ?? null,
      ),
    );
    routeStopsRepository.find.mockResolvedValue([
      { routeId: 1, stopId: 1, sequence: 1 },
      { routeId: 1, stopId: 2, sequence: 2 },
      { routeId: 1, stopId: 3, sequence: 3 },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        FaresService,
        { provide: getRepositoryToken(Fare), useValue: faresRepository },
        { provide: getRepositoryToken(Route), useValue: {} },
        {
          provide: getRepositoryToken(RouteStop),
          useValue: routeStopsRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(FaresService);
  });

  it('sums adjacent fares when there is no direct fare', async () => {
    faresRepository.findOne.mockImplementation(({ where }) => {
      if (where.originStopId === 1 && where.destinationStopId === 2) {
        return Promise.resolve({ amount: 125 });
      }
      if (where.originStopId === 2 && where.destinationStopId === 3) {
        return Promise.resolve({ amount: 275 });
      }
      return Promise.resolve(null);
    });

    await expect(service.fareBetween(1, 1, 3)).resolves.toBe(400);
  });

  it('returns no fare when an adjacent route segment is missing', async () => {
    faresRepository.findOne.mockImplementation(({ where }) =>
      where.originStopId === 1 && where.destinationStopId === 2
        ? Promise.resolve({ amount: 125 })
        : Promise.resolve(null),
    );

    await expect(service.fareBetween(1, 1, 3)).resolves.toBeNull();
  });
});
