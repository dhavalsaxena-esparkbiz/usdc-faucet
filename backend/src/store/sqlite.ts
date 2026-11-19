import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FAUCET_DRIPS_TABLE, dripsTableSql } from "./schema.js";
import type { DripStats, FaucetStore } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function migrateSqlite(db: Database.Database) {
  const cols = db.prepare(`PRAGMA table_info(${FAUCET_DRIPS_TABLE})`).all() as { name: string }[];
  if (cols.length === 0) {
    db.exec(dripsTableSql);
    return;
  }

  const hasNew = cols.some((c) => c.name === "drip_count");
  if (hasNew) return;

  db.exec(`
    CREATE TABLE ${FAUCET_DRIPS_TABLE}_migrated (
      address TEXT PRIMARY KEY,
      first_drip_at INTEGER NOT NULL,
      last_drip_at INTEGER NOT NULL,
      drip_count INTEGER NOT NULL DEFAULT 1,
      last_tx_hash TEXT NOT NULL
    );
    INSERT INTO ${FAUCET_DRIPS_TABLE}_migrated (address, first_drip_at, last_drip_at, drip_count, last_tx_hash)
    SELECT address, last_drip_at, last_drip_at, 1, tx_hash FROM drips;
    DROP TABLE IF EXISTS drips;
    ALTER TABLE ${FAUCET_DRIPS_TABLE}_migrated RENAME TO ${FAUCET_DRIPS_TABLE};
  `);
}

export function createSqliteStore(): FaucetStore {
  const dbPath = process.env.DATABASE_PATH ?? path.join(__dirname, "..", "..", "data", "faucet.db");
  let db: Database.Database;

  return {
    async init() {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      db = new Database(dbPath);
      migrateSqlite(db);
    },
    async getLastDrip(address) {
      const row = db
        .prepare(`SELECT last_drip_at FROM ${FAUCET_DRIPS_TABLE} WHERE address = ?`)
        .get(address.toLowerCase()) as { last_drip_at: number } | undefined;
      return row?.last_drip_at ?? null;
    },
    async recordDrip(address, txHash, at) {
      const normalized = address.toLowerCase();
      db.prepare(
        `INSERT INTO ${FAUCET_DRIPS_TABLE} (address, first_drip_at, last_drip_at, drip_count, last_tx_hash)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(address) DO UPDATE SET
           last_drip_at = excluded.last_drip_at,
           last_tx_hash = excluded.last_tx_hash,
           drip_count = drip_count + 1`
      ).run(normalized, at, at, txHash);
    },
    async getStats() {
      const row = db
        .prepare(
          `SELECT COUNT(*) AS wallets, COALESCE(SUM(drip_count), 0) AS drips FROM ${FAUCET_DRIPS_TABLE}`
        )
        .get() as { wallets: number; drips: number };
      return { walletsFunded: row.wallets, totalDrips: row.drips };
    },
    async close() {
      db.close();
    },
  };
}