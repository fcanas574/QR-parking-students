import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: "permits_cache",
      columns: [
        { name: "permit_id", type: "string" },
        { name: "vehicle_id", type: "string" },
        { name: "lot_id", type: "string" },
        { name: "plate_number", type: "string" },
        { name: "status", type: "string" },
        { name: "expires_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "scan_queue",
      columns: [
        { name: "scan_id", type: "string" },
        { name: "vehicle_id", type: "string" },
        { name: "permit_id", type: "string", isOptional: true },
        { name: "lot_id", type: "string" },
        { name: "scanned_by", type: "string" },
        { name: "direction", type: "string" },
        { name: "method", type: "string" },
        { name: "is_valid", type: "boolean" },
        { name: "scanned_at", type: "number" },
        { name: "synced", type: "boolean" },
        { name: "retry_count", type: "number" },
      ],
    }),
  ],
});
