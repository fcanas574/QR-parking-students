import { getDatabase } from "../db";
import { supabase } from "@parking/shared";
import NetInfo from "@react-native-community/netinfo";

const MAX_RETRY_COUNT = 5;

interface PendingScan {
  scan_id: string;
  vehicle_id: string;
  permit_id: string | null;
  lot_id: string;
  scanned_by: string;
  direction: string;
  method: string;
  is_valid: number;
  scanned_at: number;
  synced: number;
  retry_count: number;
}

export class SyncEngine {
  private syncing = false;
  private initialSyncing = false;

  async initialSync() {
    if (this.initialSyncing) return;
    this.initialSyncing = true;

    try {
      const { data: permits } = (await supabase
        .from("permits")
        .select("*, vehicles(plate_number)")
        .eq("status", "active")) as { data: any[] | null };

      if (!permits) return;

      const db = await getDatabase();
      await db.withTransactionAsync(async () => {
        await db.runAsync("DELETE FROM permits_cache");
        for (const p of permits) {
          await db.runAsync(
            `INSERT OR REPLACE INTO permits_cache
             (permit_id, vehicle_id, lot_id, plate_number, status, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            p.id,
            p.vehicle_id,
            p.lot_id,
            (p.vehicles as any)?.plate_number ?? "",
            p.status,
            new Date(p.expires_at).getTime(),
          );
        }
      });
    } finally {
      this.initialSyncing = false;
    }
  }

  async pushQueuedScans() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return;

      const db = await getDatabase();

      const pendingRows = await db.getAllAsync<PendingScan>(
        `SELECT * FROM scan_queue
         WHERE synced = 0 AND retry_count < ?
         ORDER BY scanned_at ASC`,
        MAX_RETRY_COUNT,
      );

      if (pendingRows.length === 0) return;

      const inserts = pendingRows.map((scan) => ({
        vehicle_id: scan.vehicle_id,
        permit_id: scan.permit_id || null,
        lot_id: scan.lot_id,
        scanned_by: scan.scanned_by,
        direction: scan.direction,
        method: scan.method,
        is_valid: scan.is_valid === 1,
        scanned_at: new Date(scan.scanned_at).toISOString(),
        synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("access_logs")
        .insert(inserts as any);

      const scanIds = pendingRows.map((s) => s.scan_id);

      await db.withTransactionAsync(async () => {
        if (!error) {
          for (const id of scanIds) {
            await db.runAsync(
              "UPDATE scan_queue SET synced = 1 WHERE scan_id = ?",
              id,
            );
          }
        } else {
          for (const id of scanIds) {
            await db.runAsync(
              "UPDATE scan_queue SET retry_count = retry_count + 1 WHERE scan_id = ?",
              id,
            );
          }
        }
      });
    } finally {
      this.syncing = false;
    }
  }

  async enqueueScan(scan: {
    vehicle_id: string;
    permit_id: string | null;
    lot_id: string;
    scanned_by: string;
    direction: string;
    method: string;
    is_valid: boolean;
  }) {
    const db = await getDatabase();

    await db.runAsync(
      `INSERT INTO scan_queue
       (scan_id, vehicle_id, permit_id, lot_id, scanned_by,
        direction, method, is_valid, scanned_at, synced, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      crypto.randomUUID(),
      scan.vehicle_id,
      scan.permit_id,
      scan.lot_id,
      scan.scanned_by,
      scan.direction,
      scan.method,
      scan.is_valid ? 1 : 0,
      Date.now(),
    );

    this.pushQueuedScans().catch(() => {});
  }
}

export const syncEngine = new SyncEngine();
