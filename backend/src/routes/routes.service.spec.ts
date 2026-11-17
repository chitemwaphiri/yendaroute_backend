import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoutesService } from './routes.service';
import { Route } from './entities/route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Stop } from '../stops/entities/stop.entity';
import { Fare } from '../fares/entities/fare.entity';

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

  it('returns the total number of routes', async () => {
    repositoryMock.count.mockResolvedValue(7);
    await expect(service.count()).resolves.toEqual({ count: 7 });
  });
});
