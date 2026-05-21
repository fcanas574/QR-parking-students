import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";

let db: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (db) return db;

  if (!initPromise) {
    initPromise = (async () => {
      db = await openDatabaseAsync("parking_guard");
      await db.execAsync(SCHEMA_SQL);
      return db;
    })();
  }

  return initPromise;
}
