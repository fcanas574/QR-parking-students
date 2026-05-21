import { database } from "../db";
import { supabase } from "@parking/shared";
import NetInfo from "@react-native-community/netinfo";

export class SyncEngine {
  private syncing = false;

  async initialSync() {
    // DB types are stubs (Record<string, unknown>), so results are typed as
    // `never` when nested selects are used. Cast to `any[]` for access.
    const { data: permits } = (await supabase
      .from("permits")
      .select("*, vehicles(plate_number)")
      .eq("status", "active")) as { data: any[] | null };

    if (permits) {
      await database.write(async () => {
        const permitsCollection = database.get("permits_cache");
        // WatermelonDB `.query()` returns `Query<Model>` which lacks some
        // chainable methods in the typings when no model classes are registered;
        // cast to `any` to call `.destroyAllPermanently()`.
        await (permitsCollection.query() as any).destroyAllPermanently();
        for (const p of permits) {
          await permitsCollection.create((record: any) => {
            record.permit_id = p.id;
            record.vehicle_id = p.vehicle_id;
            record.lot_id = p.lot_id;
            record.plate_number =
              (p.vehicles as any)?.plate_number ?? "";
            record.status = p.status;
            record.expires_at = new Date(p.expires_at).getTime();
          });
        }
      });
    }
  }

  async pushQueuedScans() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return;

      const scanQueue = database.get("scan_queue");
      const pending = await (scanQueue.query() as any)
        .where("synced", false)
        .fetch();

      for (const scan of pending) {
        const { error } = await supabase.from("access_logs").insert({
          vehicle_id: (scan as any).vehicle_id,
          permit_id: (scan as any).permit_id || null,
          lot_id: (scan as any).lot_id,
          scanned_by: (scan as any).scanned_by,
          direction: (scan as any).direction,
          method: (scan as any).method,
          is_valid: (scan as any).is_valid,
          scanned_at: new Date((scan as any).scanned_at).toISOString(),
          synced_at: new Date().toISOString(),
        } as any);

        if (!error) {
          await database.write(async () => {
            await (scan as any).update((r: any) => {
              r.synced = true;
            });
          });
        }
      }
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
    await database.write(async () => {
      await database.get("scan_queue").create((record: any) => {
        record.scan_id = crypto.randomUUID();
        record.vehicle_id = scan.vehicle_id;
        record.permit_id = scan.permit_id;
        record.lot_id = scan.lot_id;
        record.scanned_by = scan.scanned_by;
        record.direction = scan.direction;
        record.method = scan.method;
        record.is_valid = scan.is_valid;
        record.scanned_at = Date.now();
        record.synced = false;
      });
    });

    this.pushQueuedScans();
  }
}

export const syncEngine = new SyncEngine();
