export const DRIPS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS drips (
    address TEXT PRIMARY KEY,
    first_drip_at BIGINT NOT NULL,
    last_drip_at BIGINT NOT NULL,
    drip_count INTEGER NOT NULL DEFAULT 1,
    last_tx_hash TEXT NOT NULL
  )
`;