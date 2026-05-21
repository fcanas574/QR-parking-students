import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { schema } from "./schema";

// NOTE: WatermelonDB's SQLite adapter requires native modules (BoringSSL + SQLite)
// that are linked at build time. This means the database will only work in:
//   - EAS Build (Android/iOS production/dev-client builds)
//   - Not Expo Go (due to missing native modules)
// The import is kept top-level so TypeScript can resolve types, but callers
// should be prepared for the database to throw at construction time in
// unsupported environments.

const adapter = new SQLiteAdapter({
  schema,
  dbName: "parking_guard",
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [],
});
