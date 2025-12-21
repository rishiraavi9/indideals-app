import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set. Database operations will fail.');
}

// Create postgres client - use connection string or a dummy for build time
const client = postgres(connectionString || 'postgresql://localhost:5432/dummy', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

export * from './schema.js';
