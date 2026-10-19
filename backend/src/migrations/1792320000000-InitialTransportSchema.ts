import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialTransportSchema1792320000000
  implements MigrationInterface
{
  name = 'InitialTransportSchema1792320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE routes (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        origin VARCHAR(150) NOT NULL,
        destination VARCHAR(150) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE stops (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        location GEOGRAPHY(Point, 4326),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_stops_location
      ON stops USING GIST (location)
    `);

    await queryRunner.query(`
      CREATE TABLE route_stops (
        route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        stop_id BIGINT NOT NULL REFERENCES stops(id) ON DELETE RESTRICT,
        stop_order INTEGER NOT NULL CHECK (stop_order > 0),
        PRIMARY KEY (route_id, stop_id),
        UNIQUE (route_id, stop_order)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE fares (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
        currency CHAR(3) NOT NULL DEFAULT 'MWK',
        notes TEXT,
        effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
        effective_to DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (effective_to IS NULL OR effective_to >= effective_from)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_fares_route_id ON fares(route_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS fares');
    await queryRunner.query('DROP TABLE IF EXISTS route_stops');
    await queryRunner.query('DROP TABLE IF EXISTS stops');
    await queryRunner.query('DROP TABLE IF EXISTS routes');
  }
}
