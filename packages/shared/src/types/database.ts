export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "student" | "staff" | "security" | "admin" | "super_admin";
export type PermitStatus = "active" | "expired" | "suspended" | "pending_approval";
export type PaymentStatus = "paid" | "unpaid" | "waived";
export type ScanDirection = "entry" | "exit";
export type ScanMethod = "nfc" | "qr" | "manual";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_id: string;
          full_name: string;
          role: UserRole;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_id: string;
          full_name?: string;
          role?: UserRole;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string;
          full_name?: string;
          role?: UserRole;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          profile_id: string;
          plate_number: string;
          make: string;
          model: string;
          color: string;
          is_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          plate_number: string;
          make?: string;
          model?: string;
          color?: string;
          is_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          plate_number?: string;
          make?: string;
          model?: string;
          color?: string;
          is_verified?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      parking_lots: {
        Row: {
          id: string;
          name: string;
          total_spaces: number;
          latitude: number | null;
          longitude: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          total_spaces?: number;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          total_spaces?: number;
          latitude?: number | null;
          longitude?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      permits: {
        Row: {
          id: string;
          profile_id: string;
          vehicle_id: string;
          lot_id: string;
          status: PermitStatus;
          starts_at: string;
          expires_at: string;
          payment_status: PaymentStatus;
          payment_id: string | null;
          auto_renew: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          vehicle_id: string;
          lot_id: string;
          status?: PermitStatus;
          starts_at?: string;
          expires_at: string;
          payment_status?: PaymentStatus;
          payment_id?: string | null;
          auto_renew?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          vehicle_id?: string;
          lot_id?: string;
          status?: PermitStatus;
          starts_at?: string;
          expires_at?: string;
          payment_status?: PaymentStatus;
          payment_id?: string | null;
          auto_renew?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "permits_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permits_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permits_lot_id_fkey";
            columns: ["lot_id"];
            referencedRelation: "parking_lots";
            referencedColumns: ["id"];
          },
        ];
      };
      access_logs: {
        Row: {
          id: string;
          permit_id: string | null;
          vehicle_id: string;
          lot_id: string;
          scanned_by: string;
          direction: ScanDirection;
          method: ScanMethod;
          is_valid: boolean;
          scanned_at: string;
          synced_at: string | null;
        };
        Insert: {
          id?: string;
          permit_id?: string | null;
          vehicle_id: string;
          lot_id: string;
          scanned_by: string;
          direction: ScanDirection;
          method?: ScanMethod;
          is_valid?: boolean;
          scanned_at?: string;
          synced_at?: string | null;
        };
        Update: {
          id?: string;
          permit_id?: string | null;
          vehicle_id?: string;
          lot_id?: string;
          scanned_by?: string;
          direction?: ScanDirection;
          method?: ScanMethod;
          is_valid?: boolean;
          scanned_at?: string;
          synced_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "access_logs_permit_id_fkey";
            columns: ["permit_id"];
            referencedRelation: "permits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_logs_lot_id_fkey";
            columns: ["lot_id"];
            referencedRelation: "parking_lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_logs_scanned_by_fkey";
            columns: ["scanned_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lot_occupancy: {
        Row: {
          id: string;
          lot_id: string;
          current_count: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          lot_id: string;
          current_count?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          lot_id?: string;
          current_count?: number;
          last_updated?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lot_occupancy_lot_id_fkey";
            columns: ["lot_id"];
            referencedRelation: "parking_lots";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_profile_if_not_exists: {
        Args: {
          p_clerk_id: string;
          p_full_name: string;
          p_role: UserRole;
          p_email: string;
        };
        Returns: string;
      };
      update_occupancy_on_entry: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_role: UserRole;
      permit_status: PermitStatus;
      payment_status: PaymentStatus;
      scan_direction: ScanDirection;
      scan_method: ScanMethod;
    };
    CompositeTypes: Record<string, never>;
  };
}
