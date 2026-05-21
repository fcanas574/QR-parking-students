import type { Database } from "./database";

// Row types from Supabase schema
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type ParkingLot = Database["public"]["Tables"]["parking_lots"]["Row"];
export type Permit = Database["public"]["Tables"]["permits"]["Row"];
export type AccessLog = Database["public"]["Tables"]["access_logs"]["Row"];
export type LotOccupancy = Database["public"]["Tables"]["lot_occupancy"]["Row"];

// Insert types
export type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
export type PermitInsert = Database["public"]["Tables"]["permits"]["Insert"];
export type AccessLogInsert = Database["public"]["Tables"]["access_logs"]["Insert"];

// App enums
export type UserRole = "student" | "staff" | "security" | "admin" | "super_admin";
export type PermitStatus = "active" | "expired" | "suspended" | "pending_approval";
export type ScanDirection = "entry" | "exit";
export type ScanMethod = "nfc" | "qr" | "manual";

// NFC/QR payload types
export interface GateTagPayload {
  gateId: string;
  lotId: string;
  type: "entry" | "exit";
}

export interface VehicleQRPayload {
  vehicleId: string;
  permitId: string;
  timestamp: number;
  hmac: string;
}

// Payment interface (stubbed)
export interface PaymentResult {
  paymentId: string;
  status: "processing" | "paid" | "failed";
  redirectUrl?: string;
}

export interface PaymentMetadata {
  permitId: string;
  lotId: string;
  amount: number;
  userId: string;
}

export interface PaymentProcessor {
  createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentResult["status"]>;
  refundPayment(paymentId: string): Promise<{ success: boolean }>;
}

// Scan result for guard app
export interface ScanResult {
  vehicle: Vehicle | null;
  permit: Permit | null;
  isValid: boolean;
  reason?: string;
  direction: ScanDirection;
  method: ScanMethod;
}
