
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from './auth/entities/user.entity';
import { Booking } from './bookings/entities/booking.entity';
import { BookingSeat } from './bookings/entities/booking-seat.entity';
import { Fare } from './fares/entities/fare.entity';
import { ContractSchemaBaseline1795400000000 } from './migrations/1795400000000-ContractSchemaBaseline';
import { Notification } from './notifications/entities/notification.entity';
import { Payment } from './payments/entities/payment.entity';
import { Route } from './routes/entities/route.entity';
import { RouteStop } from './routes/entities/route-stop.entity';
import { Schedule } from './schedules/entities/schedule.entity';
import { Stop } from './stops/entities/stop.entity';
import { Operator } from './transport/entities/operator.entity';
import { Vehicle } from './transport/entities/vehicle.entity';
import { PassengerProfile } from './users/entities/passenger-profile.entity';

config({ path: join(process.cwd(), '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5433),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  synchronize: false,
  entities: [
    User,
    PassengerProfile,
    Stop,
    Route,
    RouteStop,
    Fare,
    Schedule,
    Vehicle,
    Operator,
    Booking,
    BookingSeat,
    Payment,
    Notification,
  ],
  migrations: [
    ContractSchemaBaseline1795400000000,
  ],
  migrationsTableName: 'migrations',
});
