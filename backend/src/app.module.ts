import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { StopsModule } from './stops/stops.module';
import { RoutesModule } from './routes/routes.module';
import { FaresModule } from './fares/fares.module';
import { TransportModule } from './transport/transport.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BookingsModule } from './bookings/bookings.module';
import { UsersModule } from './users/users.module';

// Your Part 5 modules
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT') || 5433),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        
        // REMOVED SSL FOR LOCAL DOCKER

        autoLoadEntities: true,
        synchronize: true, // Set to true so Docker builds the tables
        logging: ['error', 'warn'],
      }),
    }),

    AuthModule,
    StopsModule,
    RoutesModule,
    FaresModule,
    TransportModule,
    SchedulesModule,
    BookingsModule,
    UsersModule,

    PaymentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}