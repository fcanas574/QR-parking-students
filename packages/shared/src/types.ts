// Shared types across driver and guard apps

/** User role in the parking system */
export type UserRole = 'driver' | 'guard';

/** Parking session status */
export type SessionStatus = 'active' | 'completed' | 'cancelled';

/** Base user profile */
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
}

/** Parking session */
export interface ParkingSession {
  id: string;
  driver_id: string;
  guard_id: string;
  vehicle_plate: string;
  entry_time: string;
  exit_time?: string;
  status: SessionStatus;
  qr_code: string;
  created_at: string;
}
