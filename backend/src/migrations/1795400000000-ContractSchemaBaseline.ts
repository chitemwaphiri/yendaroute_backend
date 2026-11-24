import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContractSchemaBaseline1795400000000
  implements MigrationInterface
{
  name = 'ContractSchemaBaseline1795400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM ('admin', 'passenger', 'driver');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."bookings_status_enum" AS ENUM
          ('draft', 'reviewed', 'paid', 'confirmed', 'cancelled', 'expired');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_method_enum" AS ENUM ('mobile_money', 'bank_card');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_status_enum" AS ENUM ('pending', 'successful', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL UNIQUE,
        "phoneNumber" character varying,
        "passwordHash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'passenger',
        "licenseId" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stops" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "name" character varying NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "description" character varying,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operators" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "name" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "routes" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "name" character varying NOT NULL,
        "originStopId" integer NOT NULL,
        "destinationStopId" integer NOT NULL,
        "companyName" character varying,
        "pickupLocation" character varying,
        "dropOffLocation" character varying,
        "roadName" character varying,
        "duration" character varying,
        "transfers" integer NOT NULL DEFAULT 0,
        "departureTimes" text,
        "featured" boolean NOT NULL DEFAULT false,
        "geometry" jsonb,
        "distance" double precision,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "route_stops" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "routeId" integer NOT NULL,
        "stopId" integer NOT NULL,
        "sequence" integer NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fares" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "routeId" integer NOT NULL,
        "originStopId" integer NOT NULL,
        "destinationStopId" integer NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'MWK'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "name" character varying,
        "plateNumber" character varying NOT NULL,
        "vehicleType" character varying NOT NULL,
        "capacity" integer NOT NULL,
        "description" character varying,
        "driverId" integer,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedules" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "routeId" integer NOT NULL,
        "vehicleId" integer,
        "departureStopId" integer,
        "serviceDate" date,
        "arrivalDate" date,
        "departureTime" time NOT NULL,
        "arrivalAt" time,
        "fare" numeric(10, 2),
        "currency" character varying NOT NULL DEFAULT 'MWK',
        "totalSeats" integer,
        "operatorId" integer,
        "originName" character varying,
        "destinationName" character varying,
        "operatorName" character varying,
        "routeName" character varying,
        "vehicleName" character varying,
        "transportMode" character varying,
        "daysOfWeek" character varying array NOT NULL
          DEFAULT ARRAY['MON','TUE','WED','THU','FRI','SAT','SUN'],
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "reference" character varying NOT NULL UNIQUE,
        "userId" integer NOT NULL,
        "scheduleId" integer NOT NULL,
        "travelDate" date NOT NULL,
        "seatNumber" character varying,
        "originStopId" integer NOT NULL,
        "destinationStopId" integer NOT NULL,
        "fare" numeric(10, 2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'MWK',
        "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'draft',
        "holdExpiresAt" timestamp with time zone,
        "passengerName" character varying,
        "passengerEmail" character varying,
        "phoneNumber" character varying,
        "identificationNumber" character varying,
        "idempotencyKey" character varying,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_seats" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "bookingId" integer NOT NULL,
        "scheduleId" integer NOT NULL,
        "travelDate" date NOT NULL,
        "seatNumber" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "passenger_profiles" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "userId" integer NOT NULL UNIQUE,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying,
        "identificationNumber" character varying,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "bookingId" integer NOT NULL,
        "bookingReference" character varying NOT NULL,
        "userId" integer NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'MWK',
        "method" "public"."payments_method_enum" NOT NULL,
        "provider" character varying NOT NULL DEFAULT 'simulated',
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "transactionReference" character varying NOT NULL UNIQUE,
        "paidAt" timestamp with time zone,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId" integer NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "category" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "token_blacklist" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "token" character varying NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "userId" integer NOT NULL,
        "tokenHash" character varying NOT NULL UNIQUE,
        "expiresAt" timestamp with time zone NOT NULL,
        "revokedAt" timestamp with time zone,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "serviceDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "arrivalDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paidAt" timestamp with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`
      ALTER TABLE "booking_seats"
      ALTER COLUMN "seatNumber" TYPE integer
      USING "seatNumber"::integer
    `);

    await this.ensureForeignKey(
      queryRunner,
      'routes',
      'FK_routes_origin_stop',
      'FOREIGN KEY ("originStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'routes',
      'FK_routes_destination_stop',
      'FOREIGN KEY ("destinationStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'route_stops',
      'FK_route_stops_route',
      'FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'route_stops',
      'FK_route_stops_stop',
      'FOREIGN KEY ("stopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'fares',
      'FK_fares_route',
      'FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'fares',
      'FK_fares_origin_stop',
      'FOREIGN KEY ("originStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'fares',
      'FK_fares_destination_stop',
      'FOREIGN KEY ("destinationStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'vehicles',
      'FK_vehicles_driver',
      'FOREIGN KEY ("driverId") REFERENCES "users"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'schedules',
      'FK_schedules_route',
      'FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'schedules',
      'FK_schedules_vehicle',
      'FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'schedules',
      'FK_schedules_departure_stop',
      'FOREIGN KEY ("departureStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'schedules',
      'FK_schedules_operator',
      'FOREIGN KEY ("operatorId") REFERENCES "operators"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'bookings',
      'FK_bookings_user',
      'FOREIGN KEY ("userId") REFERENCES "users"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'bookings',
      'FK_bookings_schedule',
      'FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'bookings',
      'FK_bookings_origin_stop',
      'FOREIGN KEY ("originStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'bookings',
      'FK_bookings_destination_stop',
      'FOREIGN KEY ("destinationStopId") REFERENCES "stops"("id")',
    );
    await this.ensureForeignKey(
      queryRunner,
      'booking_seats',
      'FK_booking_seats_booking',
      'FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'booking_seats',
      'FK_booking_seats_schedule',
      'FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'passenger_profiles',
      'FK_passenger_profiles_user',
      'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'payments',
      'FK_payments_booking',
      'FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'payments',
      'FK_payments_user',
      'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'notifications',
      'FK_notifications_user',
      'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
    );
    await this.ensureForeignKey(
      queryRunner,
      'refresh_tokens',
      'FK_refresh_tokens_user',
      'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_route_stops_route_sequence"
      ON "route_stops" ("routeId", "sequence")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fares_route_stops"
      ON "fares" ("routeId", "originStopId", "destinationStopId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vehicles_plate_number"
      ON "vehicles" ("plateNumber")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_booking_seats_active"
      ON "booking_seats" ("scheduleId", "travelDate", "seatNumber")
      WHERE "active" = true
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bookings_user_idempotency"
      ON "bookings" ("userId", "idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_booking_reference" ON "payments" ("bookingReference")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user" ON "refresh_tokens" ("userId")`,
    );
  }

  async down(): Promise<void> {
    throw new Error(
      'This baseline migration is additive and intentionally irreversible; use a forward migration.',
    );
  }

  private async ensureForeignKey(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    definition: string,
  ): Promise<void> {
    const column = definition.match(/FOREIGN KEY \("([^"]+)"\)/)?.[1];
    const referencedTable = definition.match(/REFERENCES "([^"]+)"/)?.[1];
    if (!column || !referencedTable) {
      throw new Error(`Invalid foreign key definition for ${table}.${name}`);
    }
    const deleteAction = definition.includes('ON DELETE CASCADE') ? 'c' : 'a';
    const existing = await queryRunner.query(
      `SELECT 1
       FROM pg_constraint constraint_row
       JOIN pg_attribute local_column
         ON local_column.attrelid = constraint_row.conrelid
        AND local_column.attnum = constraint_row.conkey[1]
       JOIN pg_attribute referenced_column
         ON referenced_column.attrelid = constraint_row.confrelid
        AND referenced_column.attnum = constraint_row.confkey[1]
       WHERE constraint_row.conrelid = to_regclass($1)
         AND constraint_row.contype = 'f'
         AND array_length(constraint_row.conkey, 1) = 1
         AND local_column.attname = $2
         AND constraint_row.confrelid = to_regclass($3)
         AND referenced_column.attname = 'id'
         AND constraint_row.confdeltype = $4
       LIMIT 1`,
      [`public.${table}`, column, `public.${referencedTable}`, deleteAction],
    );
    if (existing.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ${definition}`,
      );
    }
  }
}
