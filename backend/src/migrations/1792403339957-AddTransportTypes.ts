
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransportTypes1792400000000
  implements MigrationInterface
{
  name = 'AddTransportTypes1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE transport_types (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      INSERT INTO transport_types (name, description)
      VALUES
        ('Minibus', 'Shared passenger minibus'),
        ('Bus', 'Passenger bus'),
        ('Taxi', 'Taxi service'),
        ('Motorcycle Taxi', 'Motorcycle-based transport')
    `);

    await queryRunner.query(`
      ALTER TABLE routes
      ADD COLUMN transport_type_id BIGINT
      REFERENCES transport_types(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX idx_routes_transport_type_id
      ON routes(transport_type_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_routes_transport_type_id
    `);

    await queryRunner.query(`
      ALTER TABLE routes
      DROP COLUMN IF EXISTS transport_type_id
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS transport_types
    `);
  }
}
