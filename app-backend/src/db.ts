import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
// Cloud SQL (Postgres) via the Cloud Run unix socket: set INSTANCE_CONNECTION_NAME
// plus PGDATABASE/PGUSER/PGPASSWORD. The socket lives at /cloudsql/<INSTANCE>.
const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;

export let sequelize: Sequelize;

if (databaseUrl) {
  console.log('[Database] Connecting to PostgreSQL via DATABASE_URL...');
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });
} else if (instanceConnectionName) {
  // Cloud SQL Postgres over the Unix domain socket mounted by Cloud Run.
  console.log('[Database] Connecting to Cloud SQL (Postgres) via unix socket...');
  sequelize = new Sequelize(
    process.env.PGDATABASE || 'artifact',
    process.env.PGUSER || 'postgres',
    process.env.PGPASSWORD || '',
    {
      dialect: 'postgres',
      logging: false,
      host: `/cloudsql/${instanceConnectionName}`,
      dialectOptions: {
        socketPath: `/cloudsql/${instanceConnectionName}`,
      },
    }
  );
} else {
  console.log('[Database] Connecting to local SQLite database...');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(process.cwd(), 'db.sqlite'),
    logging: false,
  });
}

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connection has been established successfully.');
    // In production prefer migrations; `alter` is dev-only to avoid destructive
    // schema drift. Plain sync() in production creates missing tables without altering.
    await sequelize.sync(isProduction ? {} : { alter: true });
    console.log('[Database] Models synchronized with the database schema.');
  } catch (error) {
    console.error('[Database] Unable to connect to the database:', error);
    // Fail fast: do not let the server start up in a broken, DB-less state.
    throw error;
  }
}
