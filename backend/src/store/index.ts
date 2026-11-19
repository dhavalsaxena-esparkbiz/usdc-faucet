import { createPostgresStore } from "./postgres.js";
import { createSqliteStore } from "./sqlite.js";
import type { FaucetStore } from "./types.js";

export type { DripStats, FaucetStore } from "./types.js";

export type StoreBackend = "postgres" | "sqlite";

export function getStoreBackend(): StoreBackend {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "sqlite";
}

export function createStore(): FaucetStore {
  const url = process.env.DATABASE_URL?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !url) {
    throw new Error(
      "DATABASE_URL is required in production (Render env). " +
        "SQLite is ephemeral and loses wallet counts on every restart."
    );
  }

  if (url) {
    console.log("Using PostgreSQL (DATABASE_URL)");
    return createPostgresStore(url);
  }
  console.log("Using SQLite (local file — set DATABASE_URL for Postgres)");
  return createSqliteStore();
}