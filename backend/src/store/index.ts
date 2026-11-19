import { createPostgresStore } from "./postgres.js";
import { createSqliteStore } from "./sqlite.js";
import type { FaucetStore } from "./types.js";

export type { DripStats, FaucetStore } from "./types.js";

export function createStore(): FaucetStore {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    console.log("Using PostgreSQL (DATABASE_URL)");
    return createPostgresStore(url);
  }
  console.log("Using SQLite (local file — set DATABASE_URL for Postgres)");
  return createSqliteStore();
}