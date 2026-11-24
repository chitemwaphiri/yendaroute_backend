import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BookingsController } from '../src/bookings/bookings.controller';
import { BookingsService } from '../src/bookings/bookings.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PassengerGuard } from '../src/auth/guards/passenger.guard';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { RoutesController } from '../src/routes/routes.controller';
import { RoutesService } from '../src/routes/routes.service';
import { AdminSchedulesController } from '../src/schedules/admin-schedules.controller';
import { SchedulesService } from '../src/schedules/schedules.service';
import { StopsController } from '../src/stops/stops.controller';
import { StopsService } from '../src/stops/stops.service';
import {
  OperatorsController,
  TransportController,
} from '../src/transport/transport.controller';
import { TransportService } from '../src/transport/transport.service';
import { FaresController } from '../src/fares/fares.controller';
import { FaresService } from '../src/fares/fares.service';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';
import {
  HttpErrorFilter,
  validationExceptionFactory,
} from '../src/common/http-error.filter';

describe('Booking contract (e2e)', () => {
  let app: INestApplication;
  const bookingsService = { create: jest.fn() };
  const routesService = { create: jest.fn() };
  const schedulesService = { create: jest.fn() };
  const stopsService = { create: jest.fn() };
  const transportService = {
    create: jest.fn(),
    createOperator: jest.fn(),
  };
  const faresService = { create: jest.fn() };
  const paymentsService = { recordContractPayment: jest.fn() };
  const authenticatedPassenger = {
    canActivate(context: {
      switchToHttp: () => { getRequest: () => { user?: unknown } };
    }) {
      context.switchToHttp().getRequest().user = {
        userId: 7,
        role: 'admin',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        BookingsController,
        RoutesController,
        AdminSchedulesController,
        StopsController,
        TransportController,
        OperatorsController,
        FaresController,
        PaymentsController,
      ],
      providers: [
        { provide: BookingsService, useValue: bookingsService },
        { provide: RoutesService, useValue: routesService },
        { provide: SchedulesService, useValue: schedulesService },
        { provide: StopsService, useValue: stopsService },
        { provide: TransportService, useValue: transportService },
        { provide: FaresService, useValue: faresService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authenticatedPassenger)
      .overrideGuard(PassengerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpErrorFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    bookingsService.create.mockReset();
    bookingsService.create.mockResolvedValue({
      id: '18',
      reference: 'MOVA-ABC123',
      tripId: '1',
      selectedSeats: [1, 2],
      status: 'draft',
    });
    routesService.create.mockReset();
    routesService.create.mockImplementation(async (dto) => dto);
    schedulesService.create.mockReset();
    schedulesService.create.mockImplementation(async (dto) => dto);
    stopsService.create.mockReset();
    stopsService.create.mockImplementation(async (dto) => dto);
    transportService.create.mockReset();
    transportService.create.mockImplementation(async (dto) => dto);
    transportService.createOperator.mockReset();
    transportService.createOperator.mockImplementation(async (dto) => dto);
    faresService.create.mockReset();
    faresService.create.mockImplementation(async (_routeId, dto) => dto);
    paymentsService.recordContractPayment.mockReset();
    paymentsService.recordContractPayment.mockImplementation(
      async (_reference, _userId, dto) => dto,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts the canonical booking request and returns its contract fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send({ tripId: 'TRIP001', selectedSeats: [1, 2] })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          tripId: '1',
          selectedSeats: [1, 2],
          status: 'draft',
        });
      });

    expect(bookingsService.create).toHaveBeenCalledWith(
      7,
      {
        tripId: 'TRIP001',
        selectedSeats: [1, 2],
      },
      undefined,
    );
  });

  it('rejects undocumented booking body aliases using the API error envelope', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send({ scheduleId: 1, seatNumbers: [1] })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          message: expect.any(String),
        });
        expect(Object.keys(body).sort()).toEqual([
          'error',
          'message',
          'statusCode',
        ]);
      });

    expect(bookingsService.create).not.toHaveBeenCalled();
  });

  it('accepts the route creation payload defined by the frontend contract', async () => {
    const route = {
      name: 'Lilongwe - Blantyre',
      roadName: 'M1',
      originStopId: 1,
      destinationStopId: 2,
      intermediateStopIds: [3],
      companyName: 'MOVA Express',
      pickupLocation: 'Lilongwe Bus Depot',
      dropOffLocation: 'Wenela Bus Depot',
      departureTimes: ['07:00', '14:00'],
      isActive: true,
      distance: 312.5,
      duration: '4h 30m',
      transfers: 0,
      featured: false,
    };

    await request(app.getHttpServer())
      .post('/api/v1/routes')
      .send(route)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(route));

    expect(routesService.create).toHaveBeenCalledWith(route, {
      userId: 7,
      role: 'admin',
    });
  });

  it('accepts the route form payload when map metadata is unavailable', async () => {
    const route = {
      name: 'Blantyre - Lilongwe',
      roadName: 'M1',
      originStopId: 1,
      destinationStopId: 2,
      intermediateStopIds: [],
      companyName: 'MOVA',
      pickupLocation: 'Wenela Bus Depot',
      dropOffLocation: 'Lilongwe Bus Depot',
      departureTimes: ['06:00'],
      isActive: true,
      featured: false,
    };

    await request(app.getHttpServer())
      .post('/api/v1/routes')
      .send(route)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(route));

    expect(routesService.create).toHaveBeenCalledWith(route, {
      userId: 7,
      role: 'admin',
    });
  });

  it('accepts the schedule creation payload defined by the frontend contract', async () => {
    const schedule = {
      origin: 'Lilongwe',
      destination: 'Blantyre',
      departureTime: '2026-11-23T07:00:00Z',
      arrivalTime: '2026-11-23T12:00:00Z',
      fare: 75000,
      currency: 'MWK',
      totalSeats: 42,
      operatorName: 'MOVA Express',
      routeName: 'M1',
      vehicleName: 'MOVA 1',
      transportMode: 'Bus',
    };

    await request(app.getHttpServer())
      .post('/api/v1/schedules')
      .send(schedule)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(schedule));

    expect(schedulesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ fare: 75000, totalSeats: 42 }),
    );
  });

  it('requires all canonical route creation fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/routes')
      .send({ name: 'Incomplete route', distance: 300 })
      .expect(400);

    expect(routesService.create).not.toHaveBeenCalled();
  });

  it('accepts the stop payload defined by the frontend contract', async () => {
    const stop = {
      name: 'Lilongwe Old Town',
      latitude: -13.9626,
      longitude: 33.7741,
      isActive: true,
    };

    await request(app.getHttpServer())
      .post('/api/v1/stops')
      .send(stop)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(stop));

    expect(stopsService.create).toHaveBeenCalledWith(stop);
  });

  it('accepts the vehicle and operator fields sent by the frontend', async () => {
    const vehicle = {
      name: 'MOVA 1',
      registrationNumber: 'BA 1234',
      type: 'Bus',
      seatCapacity: 42,
      isActive: true,
    };
    const operator = { name: 'MOVA Express', isActive: true };

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .send(vehicle)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(vehicle));
    await request(app.getHttpServer())
      .post('/api/v1/operators')
      .send(operator)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(operator));

    expect(transportService.create).toHaveBeenCalledWith(vehicle);
    expect(transportService.createOperator).toHaveBeenCalledWith(operator);
  });

  it('accepts route fare and payment request fields from the frontend', async () => {
    const fare = {
      originStopId: 1,
      destinationStopId: 2,
      amount: 75000,
      currency: 'MWK',
    };
    const payment = {
      paymentMethod: 'Airtel Money',
      paymentReference: 'MPAY-123456',
    };
    const normalizedPayment = {
      ...payment,
      paymentMethod: 'MobileMoney',
    };

    await request(app.getHttpServer())
      .post('/api/v1/routes/1/fares')
      .send(fare)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(fare));
    await request(app.getHttpServer())
      .post('/api/v1/bookings/MOVA-ABC123/payment')
      .send(payment)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(normalizedPayment));

    expect(faresService.create).toHaveBeenCalledWith(1, fare);
    expect(paymentsService.recordContractPayment).toHaveBeenCalledWith(
      'MOVA-ABC123',
      7,
      normalizedPayment,
    );
  });

  it.each([
    ['TNM Mpamba', 'MobileMoney'],
    ['Mobile Money', 'MobileMoney'],
    ['MobileMoney', 'MobileMoney'],
    ['Bank Card', 'Card'],
    ['Card', 'Card'],
  ])('normalizes frontend payment method %s', async (input, normalized) => {
    const payment = {
      paymentMethod: input,
      paymentReference: `TEST-${input.replace(/\W+/g, '-')}`,
    };
    const expected = { ...payment, paymentMethod: normalized };

    await request(app.getHttpServer())
      .post('/api/v1/bookings/MOVA-ABC123/payment')
      .send(payment)
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject(expected));

    expect(paymentsService.recordContractPayment).toHaveBeenCalledWith(
      'MOVA-ABC123',
      7,
      expected,
    );
  });

  it('rejects schedules above the frontend 42-seat limit', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/schedules')
      .send({
        origin: 'Lilongwe',
        destination: 'Blantyre',
        departureTime: '2026-11-23T07:00:00Z',
        arrivalTime: '2026-11-23T12:00:00Z',
        fare: 75000,
        currency: 'MWK',
        totalSeats: 43,
        operatorName: 'MOVA Express',
        routeName: 'M1',
        vehicleName: 'MOVA 1',
        transportMode: 'Bus',
      })
      .expect(400);

    expect(schedulesService.create).not.toHaveBeenCalled();
  });
});
