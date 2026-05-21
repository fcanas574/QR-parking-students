export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      vehicles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      parking_lots: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      permits: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      access_logs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      lot_occupancy: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
  };
}
