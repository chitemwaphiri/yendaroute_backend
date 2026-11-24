import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoutesService } from './routes.service';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Fare } from '../fares/entities/fare.entity';
import { Schedule } from '../schedules/entities/schedule.entity';

describe('RoutesService', () => {
  let service: RoutesService;
  const repositoryMock = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((value: any) => value),
    save: jest.fn((value: any) => value),
    update: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    findBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: getRepositoryToken(Route), useValue: repositoryMock },
        { provide: getRepositoryToken(RouteStop), useValue: repositoryMock },
        { provide: getRepositoryToken(Stop), useValue: repositoryMock },
        { provide: getRepositoryToken(Fare), useValue: repositoryMock },
        { provide: getRepositoryToken(Schedule), useValue: repositoryMock },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn(), getRepository: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('formats a route using frontend fields and kilometers', async () => {
    repositoryMock.find
      .mockResolvedValueOnce([
        {
          id: 1,
          routeId: 1,
          originStopId: 1,
          destinationStopId: 5,
          amount: '75000',
          currency: 'MWK',
        },
      ])
      .mockResolvedValueOnce([]);

    const route = {
      id: 1,
      name: 'Zomba to Mzuzu Express',
      originStopId: 1,
      destinationStopId: 5,
      companyName: 'YendaRoute Ltd',
      roadName: 'M1',
      originStop: { id: 1, name: 'Zomba' },
      destinationStop: { id: 5, name: 'Mzuzu' },
      routeStops: [
        { sequence: 1, stop: { id: 1, name: 'Zomba' } },
        { sequence: 2, stop: { id: 5, name: 'Mzuzu' } },
      ],
      pickupLocation: 'Zomba Main Terminal',
      dropOffLocation: 'Wenela Bus Depot',
      distance: 450000,
      duration: '4h 30m',
      transfers: 0,
      departureTimes: ['07:00', '14:00'],
      isActive: true,
      featured: true,
    };

    const result = await (service as any).formatRouteResponse(route);

    expect(result).toMatchObject({
      id: '1',
      name: 'Zomba to Mzuzu Express',
      companyName: 'YendaRoute Ltd',
      roadName: 'M1',
      originStop: { id: 1, name: 'Zomba' },
      destinationStop: { id: 5, name: 'Mzuzu' },
      routeStops: [
        { id: 1, name: 'Zomba' },
        { id: 5, name: 'Mzuzu' },
      ],
      pickupLocation: 'Zomba Main Terminal',
      dropOffLocation: 'Wenela Bus Depot',
      fareEstimate: 75000,
      currency: 'MWK',
      distance: 450,
      duration: '4h 30m',
      transfers: 0,
      departureTimes: ['07:00', '14:00'],
      isActive: true,
      featured: true,
    });
  });

  it('accepts canonical stop IDs in a partial route update and preserves intermediate stops', async () => {
    const existingRoute = {
      id: 1,
      originStopId: 1,
      destinationStopId: 2,
    };
    const stops = [
      { id: 2, longitude: 34, latitude: -15 },
      { id: 3, longitude: 33, latitude: -14 },
      { id: 4, longitude: 32, latitude: -13 },
    ];
    repositoryMock.findOne.mockResolvedValue(existingRoute);
    repositoryMock.find.mockResolvedValue([
      { stopId: 1, sequence: 1 },
      { stopId: 3, sequence: 2 },
      { stopId: 2, sequence: 3 },
    ]);
    repositoryMock.findBy.mockResolvedValue(stops);
    const findOneSpy = jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: '1' } as any);

    await service.update(1, { originStopId: 4 }, {});

    expect(repositoryMock.delete).toHaveBeenCalledWith({ routeId: 1 });
    expect(repositoryMock.save).toHaveBeenCalledWith([
      { routeId: 1, stopId: 4, sequence: 1 },
      { routeId: 1, stopId: 3, sequence: 2 },
      { routeId: 1, stopId: 2, sequence: 3 },
    ]);
    expect(repositoryMock.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ originStopId: 4, destinationStopId: 2 }),
    );
    expect(repositoryMock.update.mock.calls[0][1]).not.toHaveProperty(
      'intermediateStopIds',
    );
    expect(findOneSpy).toHaveBeenCalledWith(1);
  });
});
