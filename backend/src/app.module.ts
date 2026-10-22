import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import your modules
import { AuthModule } from './auth/auth.module';
import { RoutesModule } from './routes/routes.module';
import { SearchModule } from './search/search.module';
import { StopsModule } from './stops/stops.module';
import { BookingModule } from './booking/booking.module';
import { TransportTypesModule } from './transport-types/transport-types.module';
import { SchedulesModule } from './schedules/schedules.module'; // <-- NEW IMPORT

export const ObserveInstrument = {
  instanceDecorator: (instance: unknown) => instance,
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    RoutesModule,
    SearchModule,
    StopsModule,
    BookingModule,
    TransportTypesModule,
    SchedulesModule, // <-- NEW MODULE ADDED
  ],
})
export class AppModule {}