import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  HttpErrorFilter,
  validationExceptionFactory,
} from '../src/common/http-error.filter';

const databaseContractSuite =
  process.env.CONTRACT_E2E_WITH_DATABASE === 'true' ? describe : describe.skip;

databaseContractSuite('Frontend API Contract Compatibility', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let passengerUserId: number;
  let bookingReference: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpErrorFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication', () => {
    it('should register a passenger', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Passenger',
          email: 'jane@example.com',
          phone: '+265991234567',
          password: 'Password123',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Jane Passenger');
      expect(res.body.email).toBe('jane@example.com');
      expect(res.body.role).toBe('passenger');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
      passengerUserId = Number(res.body.id);
    });

    it('should not allow registration with admin role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Admin User',
          email: 'admin@example.com',
          phone: '+265991234568',
          password: 'Password123',
        })
        .expect(201);

      expect(res.body.role).toBe('passenger');
    });

    it('should login and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should get current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Jane Passenger');
      expect(res.body.email).toBe('jane@example.com');
      expect(res.body.role).toBe('passenger');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    it('should reject registration with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Incomplete' })
        .expect(400);
    });
  });

  describe('2. Passenger Profile', () => {
    it('should get passenger profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/passenger-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.name).toBeDefined();
      expect(res.body.email).toBeDefined();
      expect(res.body.phone).toBeDefined();
      expect(res.body.identificationNumber).toBeDefined();
    });

    it('should update passenger profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me/passenger-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Jane Passenger Updated',
          email: 'jane.updated@example.com',
          phone: '+265991234567',
          identificationNumber: 'P123456',
        })
        .expect(200);

      expect(res.body.name).toBe('Jane Passenger Updated');
      expect(res.body.email).toBe('jane.updated@example.com');
      expect(res.body.phone).toBe('+265991234567');
      expect(res.body.identificationNumber).toBe('P123456');
    });
  });

  describe('3. Stops', () => {
    it('should search stops', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stops/places/search')
        .query({ q: 'Lilongwe', limit: 8 })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('4. Routes', () => {
    it('should list routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/routes')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('5. Schedules', () => {
    it('should list schedules', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should get schedule by ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules/1')
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.origin).toBeDefined();
      expect(res.body.destination).toBeDefined();
      expect(res.body.departureTime).toBeDefined();
      expect(res.body.fare).toBeDefined();
      expect(typeof res.body.fare).toBe('number');
    });

    it('should get seat availability', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules/1/seats')
        .expect(200);

      expect(res.body.scheduleId).toBeDefined();
      expect(res.body.totalSeats).toBeDefined();
      expect(Array.isArray(res.body.bookedSeats)).toBe(true);
      expect(Array.isArray(res.body.availableSeats)).toBe(true);
    });
  });

  describe('6. Bookings', () => {
    it('should create a draft booking', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tripId: '1', selectedSeats: [1, 2] })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.reference).toBeDefined();
      expect(res.body.tripId).toBe('1');
      expect(Array.isArray(res.body.selectedSeats)).toBe(true);
      expect(res.body.selectedSeats).toEqual([1, 2]);
      expect(res.body.status).toBe('draft');
      bookingReference = res.body.reference;
    });

    it('should reject undocumented booking aliases', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ scheduleId: 1, seatNumbers: [1] })
        .expect(400);
    });

    it('should reject booking with more than 5 seats', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tripId: '1', selectedSeats: [1, 2, 3, 4, 5, 6] })
        .expect(400);
    });

    it('should update passenger details (draft -> reviewed)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingReference}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          passengerName: 'Jane Passenger',
          passengerEmail: 'jane@example.com',
          phoneNumber: '+265991234567',
          identificationNumber: 'P123456',
        })
        .expect(200);

      expect(res.body.status).toBe('reviewed');
      expect(res.body.passengerName).toBe('Jane Passenger');
    });

    it('should get booking by reference', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingReference}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.reference).toBe(bookingReference);
      expect(res.body.tripId).toBeDefined();
      expect(res.body.selectedSeats).toBeDefined();
      expect(res.body.passenger).toBeDefined();
    });

    it('should get my bookings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('7. Error handling', () => {
    it('should return structured validation errors', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: 'short' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('should reject unauthorized access', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .expect(401);
    });
  });
});