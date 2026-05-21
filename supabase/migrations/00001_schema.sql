-- Enums
CREATE TYPE user_role AS ENUM ('student', 'staff', 'security', 'admin', 'super_admin');
CREATE TYPE permit_status AS ENUM ('active', 'expired', 'suspended', 'pending_approval');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'waived');
CREATE TYPE scan_direction AS ENUM ('entry', 'exit');
CREATE TYPE scan_method AS ENUM ('nfc', 'qr', 'manual');

-- Profiles (synced from Clerk on first sign-in)
CREATE TABLE profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id text UNIQUE NOT NULL,
    full_name text NOT NULL DEFAULT '',
    role user_role NOT NULL DEFAULT 'student',
    email text,
    phone text,
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Vehicles
CREATE TABLE vehicles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plate_number text UNIQUE NOT NULL,
    make text NOT NULL DEFAULT '',
    model text NOT NULL DEFAULT '',
    color text NOT NULL DEFAULT '',
    is_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Parking lots
CREATE TABLE parking_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    total_spaces integer NOT NULL DEFAULT 0,
    latitude double precision,
    longitude double precision,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Permits
CREATE TABLE permits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    lot_id uuid NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
    status permit_status NOT NULL DEFAULT 'pending_approval',
    starts_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    payment_id text,
    auto_renew boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Access logs
CREATE TABLE access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id uuid REFERENCES permits(id) ON DELETE SET NULL,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    lot_id uuid NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
    scanned_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    direction scan_direction NOT NULL,
    method scan_method NOT NULL DEFAULT 'qr',
    is_valid boolean NOT NULL DEFAULT true,
    scanned_at timestamptz NOT NULL DEFAULT now(),
    synced_at timestamptz
);

-- Lot occupancy (one row per lot, updated by trigger)
CREATE TABLE lot_occupancy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id uuid NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE UNIQUE,
    current_count integer NOT NULL DEFAULT 0,
    last_updated timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vehicles_profile ON vehicles(profile_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_permits_profile ON permits(profile_id);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_lot ON permits(lot_id);
CREATE INDEX idx_access_logs_lot ON access_logs(lot_id);
CREATE INDEX idx_access_logs_vehicle ON access_logs(vehicle_id);
CREATE INDEX idx_access_logs_scanned ON access_logs(scanned_at);
CREATE INDEX idx_access_logs_synced ON access_logs(synced_at) WHERE synced_at IS NULL;
