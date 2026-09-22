import { Pool, type PoolClient } from "pg";

let pool: Pool | undefined;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
    pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      maxUses: 5_000,
    });
  }
  return pool;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
