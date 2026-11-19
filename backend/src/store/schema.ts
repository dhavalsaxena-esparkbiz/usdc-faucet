/** Separate table name so the faucet can share a Postgres DB with other apps (e.g. bridge sandbox). */
export const FAUCET_DRIPS_TABLE =
  process.env.FAUCET_DB_TABLE?.replace(/[^a-zA-Z0-9_]/g, "") || "faucet_drips";

export const dripsTableSql = `
  CREATE TABLE IF NOT EXISTS ${FAUCET_DRIPS_TABLE} (
    address TEXT PRIMARY KEY,
    first_drip_at BIGINT NOT NULL,
    last_drip_at BIGINT NOT NULL,
    drip_count INTEGER NOT NULL DEFAULT 1,
    last_tx_hash TEXT NOT NULL
  )
`;