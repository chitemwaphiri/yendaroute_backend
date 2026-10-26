import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StopsModule } from './stops/stops.module';
import { TransportModule } from './transport/transport.module';
import { RoutesModule } from './routes/routes.module';
import { FaresModule } from './fares/fares.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BookingsModule } from './bookings/bookings.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module'; // <-- ADDED THIS

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        logging: ['error', 'warn'],
        ssl: {
          rejectUnauthorized: false, 
        },
      }),
    }),

    AuthModule,
    StopsModule,
    TransportModule,
    RoutesModule,
    FaresModule,
    SchedulesModule,
    BookingsModule,
    SearchModule,
    UsersModule, // <-- ADDED THIS
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}