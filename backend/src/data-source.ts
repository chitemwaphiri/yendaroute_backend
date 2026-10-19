
import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

config({ path: join(process.cwd(), '..', '.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  synchronize: false,

  entities: [],

  migrations: [join(process.cwd(), 'src', 'migrations', '*.{ts,js}')],
});

export default dataSource;
