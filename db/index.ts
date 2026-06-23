import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Reuse a single client across module reloads / warm serverless invocations.
// (For best latency on Neon, point DATABASE_URL at the pooled "-pooler" endpoint.)
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client =
  globalForDb.conn ??
  postgres(connectionString, {
    // prepare:false is required for Neon "Transaction" pool mode.
    prepare: false,
    // Keep the pool small for serverless and recycle idle sockets so we don't
    // exhaust Neon's connection limit.
    max: 10,
    idle_timeout: 20,
    // Neon (free tier) scales the compute to zero after ~5 min idle. The pooler
    // accepts the TCP socket instantly, but the first query has to wait for the
    // compute to wake, which often takes >10s. A short connect_timeout turns that
    // cold start into a CONNECT_TIMEOUT error, so give it room to wake up.
    connect_timeout: 30,
    // Keep idle sockets alive so warm instances don't get reaped mid-flight.
    keep_alive: 30,
  });

// Cache in every environment (including production) so warm instances reuse the
// connection instead of paying a fresh TCP+TLS handshake to Neon per request.
globalForDb.conn = client;

export const db = drizzle(client, { schema });
