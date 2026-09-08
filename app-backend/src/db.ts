import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

export let sequelize: Sequelize;

if (databaseUrl) {
  console.log('[Database] Connecting to PostgreSQL database...');
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
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('[Database] Models synchronized with the database schema.');
  } catch (error) {
    console.error('[Database] Unable to connect to the database:', error);
  }
}
