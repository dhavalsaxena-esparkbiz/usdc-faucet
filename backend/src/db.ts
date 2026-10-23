import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH ?? path.join(__dirname, "..", "data", "faucet.db");

export function openDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS drips (
      address TEXT PRIMARY KEY,
      last_drip_at INTEGER NOT NULL,
      tx_hash TEXT NOT NULL
    )
  `);
  return db;
}

export function getLastDrip(db: Database.Database, address: string): number | null {
  const row = db
    .prepare("SELECT last_drip_at FROM drips WHERE address = ?")
    .get(address.toLowerCase()) as { last_drip_at: number } | undefined;
  return row?.last_drip_at ?? null;
}

export function recordDrip(
  db: Database.Database,
  address: string,
  txHash: string,
  at: number
) {
  db.prepare(
    `INSERT INTO drips (address, last_drip_at, tx_hash)
     VALUES (?, ?, ?)
     ON CONFLICT(address) DO UPDATE SET last_drip_at = excluded.last_drip_at, tx_hash = excluded.tx_hash`
  ).run(address.toLowerCase(), at, txHash);
}

export function countFundedWallets(db: Database.Database): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM drips").get() as { n: number };
  return row.n;
}
