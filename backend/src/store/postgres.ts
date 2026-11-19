import pg from "pg";
import { DRIPS_TABLE_SQL } from "./schema.js";
import type { FaucetStore } from "./types.js";

const { Pool } = pg;

export function createPostgresStore(connectionString: string): FaucetStore {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  return {
    async init() {
      await pool.query(DRIPS_TABLE_SQL);
    },
    async getLastDrip(address) {
      const result = await pool.query(
        "SELECT last_drip_at FROM drips WHERE address = $1",
        [address.toLowerCase()]
      );
      const row = result.rows[0] as { last_drip_at: string } | undefined;
      return row ? Number(row.last_drip_at) : null;
    },
    async recordDrip(address, txHash, at) {
      const normalized = address.toLowerCase();
      await pool.query(
        `INSERT INTO drips (address, first_drip_at, last_drip_at, drip_count, last_tx_hash)
         VALUES ($1, $2, $2, 1, $3)
         ON CONFLICT (address) DO UPDATE SET
           last_drip_at = EXCLUDED.last_drip_at,
           last_tx_hash = EXCLUDED.last_tx_hash,
           drip_count = drips.drip_count + 1`,
        [normalized, at, txHash]
      );
    },
    async getStats() {
      const result = await pool.query(
        "SELECT COUNT(*)::int AS wallets, COALESCE(SUM(drip_count), 0)::int AS drips FROM drips"
      );
      const row = result.rows[0] as { wallets: number; drips: number };
      return { walletsFunded: row.wallets, totalDrips: row.drips };
    },
    async close() {
      await pool.end();
    },
  };
}