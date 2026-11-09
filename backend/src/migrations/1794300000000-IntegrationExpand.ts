import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive only: creates new tables, adds nullable columns, relaxes old NOT NULLs.
 * It drops NOTHING, so teammates on older code keep working.
 */
export class IntegrationExpand1794300000000 implements MigrationInterface {
  name = 'IntegrationExpand1794300000000';

  public async up(q: QueryRunner): Promise<void> {
    const run = (sql: string) => q.query(sql);
    const enumType = (name: string, values: string) =>
      run(`DO $$ BEGIN CREATE TYPE "public"."${name}" AS ENUM(${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await run(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ---------- users (Part 1)
    await run(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "licenseId" character varying`);
    await run(`ALTER TABLE "users" ALTER COLUMN "phoneNumber" DROP NOT NULL`);

    await run(`CREATE TABLE IF NOT EXISTS "refresh_tokens" (
      "id" SERIAL NOT NULL, "userId" integer NOT NULL, "tokenHash" character varying NOT NULL,
      "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("tokenHash"),
      CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"))`);
    await run(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user" ON "refresh_tokens" ("userId")`);

    await enumType('role_requests_type_enum', `'admin', 'driver'`);
    await enumType('role_requests_status_enum', `'pending', 'approved', 'rejected'`);
    await run(`CREATE TABLE IF NOT EXISTS "role_requests" (
      "id" SERIAL NOT NULL, "userId" integer NOT NULL,
      "type" "public"."role_requests_type_enum" NOT NULL,
      "status" "public"."role_requests_status_enum" NOT NULL DEFAULT 'pending',
      "reason" character varying, "licenseId" character varying,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_role_requests" PRIMARY KEY ("id"))`);

    await run(`CREATE TABLE IF NOT EXISTS "passenger_profiles" (
      "id" SERIAL NOT NULL, "userId" integer NOT NULL, "name" character varying NOT NULL,
      "email" character varying NOT NULL, "phone" character varying,
      "identificationNumber" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_passenger_profiles_user" UNIQUE ("userId"),
      CONSTRAINT "PK_passenger_profiles" PRIMARY KEY ("id"))`);

    // ---------- routes (Part 2)
    await run(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "companyName" character varying`);
    await run(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "pickupLocation" character varying`);
    await run(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`);
    await run(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "geometry" jsonb`);
    await run(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "distance" double precision`);
    await run(`ALTER TABLE "routes" ALTER COLUMN "transportTypeId" DROP NOT NULL`);

    // ---------- vehicles + schedules (Part 3)
    await run(`CREATE TABLE IF NOT EXISTS "vehicles" (
      "id" SERIAL NOT NULL, "plateNumber" character varying NOT NULL,
      "vehicleType" character varying NOT NULL, "capacity" integer NOT NULL,
      "description" character varying, "driverId" integer,
      "isActive" boolean NOT NULL DEFAULT true,
      CONSTRAINT "PK_vehicles" PRIMARY KEY ("id"))`);
    await run(`ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "vehicleId" integer`);
    await run(`ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "departureStopId" integer`);
    await run(`ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "arrivalAt" TIME`);
    await run(`ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "fare" numeric(10,2)`);
    await run(`ALTER TABLE "schedules" ALTER COLUMN "seatCapacity" DROP NOT NULL`);

    // ---------- bookings (Part 4)
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "seatNumber" character varying`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "fare" numeric(10,2)`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "currency" character varying NOT NULL DEFAULT 'MWK'`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "holdExpiresAt" TIMESTAMP WITH TIME ZONE`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "passengerName" character varying`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "passengerEmail" character varying`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "phoneNumber" character varying`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "identificationNumber" character varying`);
    await run(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying`);
    await run(`ALTER TABLE "bookings" ALTER COLUMN "seats" DROP NOT NULL`);
    await run(`ALTER TABLE "bookings" ALTER COLUMN "estimatedFare" DROP NOT NULL`);
    await run(`ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'draft'`);
    await run(`ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'reviewed'`);
    await run(`ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'paid'`);
    await run(`ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'expired'`);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bookings_user_idem" ON "bookings" ("userId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);

    await run(`CREATE TABLE IF NOT EXISTS "booking_seats" (
      "id" SERIAL NOT NULL, "bookingId" integer NOT NULL, "scheduleId" integer NOT NULL,
      "travelDate" date NOT NULL, "seatNumber" character varying NOT NULL,
      "active" boolean NOT NULL DEFAULT true,
      CONSTRAINT "PK_booking_seats" PRIMARY KEY ("id"))`);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_booking_seats_active" ON "booking_seats" ("scheduleId", "travelDate", "seatNumber") WHERE "active" = true`);

    // ---------- notifications + payments (Part 5)
    await run(`CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL,
      "title" character varying NOT NULL, "message" text NOT NULL,
      "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications" PRIMARY KEY ("id"))`);
    await run(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("userId")`);

    await enumType('payments_method_enum', `'mobile_money', 'bank_card'`);
    await enumType('payments_status_enum', `'pending', 'successful', 'failed'`);
    await run(`CREATE TABLE IF NOT EXISTS "payments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" integer NOT NULL,
      "bookingReference" character varying NOT NULL, "userId" integer NOT NULL,
      "amount" numeric(10,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'MWK',
      "method" "public"."payments_method_enum" NOT NULL,
      "provider" character varying NOT NULL DEFAULT 'simulated',
      "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
      "transactionReference" character varying NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_payments_txref" UNIQUE ("transactionReference"),
      CONSTRAINT "PK_payments" PRIMARY KEY ("id"))`);
    await run(`CREATE INDEX IF NOT EXISTS "IDX_payments_booking_ref" ON "payments" ("bookingReference")`);
  }

  // Only removes the NEW tables. It never touches old data.
  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['payments', 'notifications', 'booking_seats', 'vehicles',
      'passenger_profiles', 'role_requests', 'refresh_tokens']) {
      await q.query(`DROP TABLE IF EXISTS "${t}"`);
    }
  }
}