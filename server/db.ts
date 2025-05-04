import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Provide websocket implementation for Neon serverless
neonConfig.webSocketConstructor = ws;

// Ensure required environment variables are present
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize database connection
let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  console.log("Initializing database connection...");
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000, // How long to wait for a connection
  });
  
  // Test the connection
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
    process.exit(-1);
  });

  db = drizzle(pool, { schema });
  console.log("Database connection established successfully.");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw error;
}

export { pool, db };