const DDL = `
CREATE TABLE IF NOT EXISTS permits_cache (
  permit_id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  plate_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scan_queue (
  scan_id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  permit_id TEXT,
  lot_id TEXT NOT NULL,
  scanned_by TEXT NOT NULL,
  direction TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'qr',
  is_valid INTEGER NOT NULL DEFAULT 1,
  scanned_at INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0
);
`;

export const SCHEMA_SQL = DDL;
