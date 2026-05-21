# UniPark Mobile Apps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two Expo mobile apps (Driver + Guard) with a shared package, Clerk auth, Supabase backend, NFC/QR scanning, and offline support.

**Architecture:** pnpm monorepo with `apps/driver`, `apps/guard`, and `packages/shared`. Both apps use Expo Router, TanStack Query (server state), Zustand (UI state), and the shared package for all design tokens, components, hooks, and Supabase types. The Guard app adds WatermelonDB for offline permit caching and scan queue sync.

**Tech Stack:** Expo SDK 54+, Expo Router, TypeScript, Clerk Expo SDK, Supabase (PostgreSQL + RLS + Realtime + Edge Functions), TanStack Query v5, Zustand, WatermelonDB, react-native-maps

---

### Task 1: Scaffold Monorepo

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `apps/driver/` (via `create expo-app`)
- Create: `apps/guard/` (via `create expo-app`)
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create root workspace config**

Write `package.json`:
```json
{
  "name": "parking-monorepo",
  "private": true,
  "scripts": {
    "dev:driver": "pnpm --filter @parking/driver start",
    "dev:guard": "pnpm --filter @parking/guard start",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create pnpm workspace config**

Write `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo config**

Write `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "start": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 4: Create root .gitignore**

Write `.gitignore`:
```
node_modules/
.expo/
dist/
*.tsbuildinfo
.env
.env.local
.supabase/
.superpowers/
```

- [ ] **Step 5: Scaffold shared package**

Write `packages/shared/package.json`:
```json
{
  "name": "@parking/shared",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "zustand": "^5.0.0"
  },
  "peerDependencies": {
    "@tanstack/react-query": "^5.0.0"
  }
}
```

Write `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

Write `packages/shared/src/index.ts`:
```typescript
// Shared package entry point — re-exports everything
export * from './design/tokens';
export * from './types';
```

- [ ] **Step 6: Scaffold driver app**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
npx create-expo-app@latest apps/driver --template blank-typescript
```

Then modify `apps/driver/package.json` — set `"name"` to `"@parking/driver"` and add:
```json
"scripts": {
  "start": "expo start",
  "ios": "expo start --ios",
  "android": "expo start --android"
}
```

- [ ] **Step 7: Scaffold guard app**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
npx create-expo-app@latest apps/guard --template blank-typescript
```

Then modify `apps/guard/package.json` — set `"name"` to `"@parking/guard"` and add same scripts structure as driver.

- [ ] **Step 8: Install base dependencies**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm install
```

- [ ] **Step 9: Verify monorepo structure**

Run:
```bash
ls -la apps/driver/ apps/guard/ packages/shared/
```
Expected: All three directories exist with package.json files.

---

### Task 2: Supabase Schema & Migrations

**Files:**
- Create: `supabase/migrations/00001_schema.sql`
- Create: `supabase/migrations/00002_triggers.sql`
- Create: `supabase/migrations/00003_rls.sql`
- Create: `supabase/migrations/00004_seed_data.sql`
- Create: `supabase/config.toml`

- [ ] **Step 1: Initialize Supabase project**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
npx supabase init
```

- [ ] **Step 2: Create schema migration**

Write `supabase/migrations/00001_schema.sql`:
```sql
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
```

- [ ] **Step 3: Create triggers migration**

Write `supabase/migrations/00002_triggers.sql`:
```sql
-- Update lot occupancy on entry
CREATE OR REPLACE FUNCTION update_occupancy_on_entry()
RETURNS trigger AS $$
BEGIN
    IF NEW.direction = 'entry' THEN
        INSERT INTO lot_occupancy (lot_id, current_count, last_updated)
        VALUES (NEW.lot_id, 1, now())
        ON CONFLICT (lot_id) DO UPDATE
        SET current_count = lot_occupancy.current_count + 1,
            last_updated = now();
    ELSIF NEW.direction = 'exit' THEN
        UPDATE lot_occupancy
        SET current_count = GREATEST(current_count - 1, 0),
            last_updated = now()
        WHERE lot_id = NEW.lot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_occupancy_on_access
    AFTER INSERT ON access_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_occupancy_on_entry();

-- Auto-create profile on first Clerk sign-in (called from Edge Function)
CREATE OR REPLACE FUNCTION create_profile_if_not_exists(
    p_clerk_id text,
    p_full_name text,
    p_role user_role,
    p_email text
)
RETURNS uuid AS $$
DECLARE
    v_profile_id uuid;
BEGIN
    INSERT INTO profiles (clerk_id, full_name, role, email)
    VALUES (p_clerk_id, p_full_name, p_role, p_email)
    ON CONFLICT (clerk_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 4: Create RLS policies migration**

Write `supabase/migrations/00003_rls.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_occupancy ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE clerk_id = auth.jwt()->>'sub';
$$ LANGUAGE sql STABLE;

-- Profiles: users can read own, security+ can read all
CREATE POLICY "Users read own profile" ON profiles
    FOR SELECT USING (clerk_id = auth.jwt()->>'sub');
CREATE POLICY "Security read all profiles" ON profiles
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));

-- Vehicles: users CRUD own, security+ read all
CREATE POLICY "Users manage own vehicles" ON vehicles
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE clerk_id = auth.jwt()->>'sub'));
CREATE POLICY "Security read all vehicles" ON vehicles
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));

-- Parking lots: everyone can read
CREATE POLICY "Everyone reads lots" ON parking_lots
    FOR SELECT USING (true);

-- Permits: users read own, admin manages
CREATE POLICY "Users read own permits" ON permits
    FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE clerk_id = auth.jwt()->>'sub'));
CREATE POLICY "Security read all permits" ON permits
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));
CREATE POLICY "Admin manages permits" ON permits
    FOR ALL USING (current_user_role() IN ('admin', 'super_admin'));

-- Access logs: security inserts, users read own, admin reads all
CREATE POLICY "Security inserts logs" ON access_logs
    FOR INSERT WITH CHECK (current_user_role() IN ('security', 'admin', 'super_admin'));
CREATE POLICY "Users read own logs" ON access_logs
    FOR SELECT USING (vehicle_id IN (
        SELECT id FROM vehicles WHERE profile_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt()->>'sub'
        )
    ));
CREATE POLICY "Security reads all logs" ON access_logs
    FOR SELECT USING (current_user_role() IN ('security', 'admin', 'super_admin'));

-- Lot occupancy: everyone reads
CREATE POLICY "Everyone reads occupancy" ON lot_occupancy
    FOR SELECT USING (true);
CREATE POLICY "Security updates occupancy" ON lot_occupancy
    FOR UPDATE USING (current_user_role() IN ('security', 'admin', 'super_admin'));
```

- [ ] **Step 5: Create seed data migration**

Write `supabase/migrations/00004_seed_data.sql`:
```sql
-- Seed parking lots
INSERT INTO parking_lots (name, total_spaces, latitude, longitude) VALUES
    ('Lot A', 200, 40.7128, -74.0060),
    ('Lot B', 150, 40.7130, -74.0065),
    ('Lot C', 300, 40.7140, -74.0070),
    ('Visitor Lot V', 80, 40.7110, -74.0050);

-- Seed occupancy rows
INSERT INTO lot_occupancy (lot_id, current_count)
SELECT id, 0 FROM parking_lots;
```

- [ ] **Step 6: Start Supabase locally and apply migrations**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
npx supabase start
```

Expected: local Supabase running with Postgres, API on port 54321.

Run:
```bash
npx supabase db push
```

Expected: All migrations applied successfully.

- [ ] **Step 7: Generate TypeScript types**

Run:
```bash
npx supabase gen types typescript --local > packages/shared/src/types/database.ts
```

---

### Task 3: Edge Function — Clerk Token Exchange

**Files:**
- Create: `supabase/functions/exchange-token/index.ts`
- Create: `supabase/functions/exchange-token/deno.json`

- [ ] **Step 1: Create Edge Function for Clerk-to-Supabase token exchange**

Write `supabase/functions/exchange-token/deno.json`:
```json
{
  "imports": {
    "clerk": "npm:@clerk/backend@^1.0.0"
  }
}
```

Write `supabase/functions/exchange-token/index.ts`:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClerkClient } from "clerk";

const clerkClient = createClerkClient({
  secretKey: Deno.env.get("CLERK_SECRET_KEY")!,
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  const { clerkToken } = await req.json();

  if (!clerkToken) {
    return new Response(JSON.stringify({ error: "clerkToken required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Verify Clerk session token
    const { data } = await clerkClient.verifyToken(clerkToken);

    if (!data) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clerkId = data.sub;
    const role = data.public_metadata?.role ?? "student";
    const fullName = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
    const email = data.email_addresses?.[0]?.email_address ?? "";

    // Get or create profile in Supabase
    const { data: profileId, error: profileError } = await supabaseAdmin.rpc(
      "create_profile_if_not_exists",
      {
        p_clerk_id: clerkId,
        p_full_name: fullName,
        p_role: role,
        p_email: email,
      },
    );

    if (profileError) throw profileError;

    // Generate Supabase JWT for this user
    const { data: supabaseData, error: signError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    // Generate a custom Supabase JWT signed with the service role
    const { data: { session }, error: sessionError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { clerk_id: clerkId, role },
      });

    // Actually, we'll use supabaseAdmin.auth.signJwt for a cleaner approach:
    const payload = {
      sub: clerkId,
      role,
      email,
      aud: "authenticated",
    };

    const supabaseJwt = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return new Response(
      JSON.stringify({
        supabaseAccessToken: supabaseData.properties?.access_token,
        profileId,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

- [ ] **Step 2: Store Supabase URL and anon key in shared package config**

Write `packages/shared/src/lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

Write `packages/shared/src/lib/index.ts`:
```typescript
export { supabase } from "./supabase";
```

---

### Task 4: Shared Design Tokens & Types

**Files:**
- Create: `packages/shared/src/design/tokens.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/types/navigation.ts`

- [ ] **Step 1: Define design tokens from Stitch system**

Write `packages/shared/src/design/tokens.ts`:
```typescript
export const colors = {
  background: "#111317",
  surface: "#111317",
  "surface-container": "#1e2024",
  "surface-container-low": "#1a1c20",
  "surface-container-lowest": "#0c0e12",
  "surface-container-high": "#282a2e",
  "surface-container-highest": "#333539",
  "surface-bright": "#37393e",
  "surface-variant": "#333539",
  "surface-dim": "#111317",
  "surface-tint": "#00dbe9",

  primary: "#dbfcff",
  "primary-fixed": "#7df4ff",
  "primary-fixed-dim": "#00dbe9",
  "primary-container": "#00f0ff",
  "on-primary": "#00363a",
  "on-primary-fixed": "#002022",
  "on-primary-fixed-variant": "#004f54",
  "on-primary-container": "#006970",
  "inverse-primary": "#006970",

  secondary: "#ffffff",
  "secondary-fixed": "#36ffc4",
  "secondary-fixed-dim": "#00e1ab",
  "secondary-container": "#36ffc4",
  "on-secondary": "#003828",
  "on-secondary-fixed": "#002116",
  "on-secondary-fixed-variant": "#00513c",
  "on-secondary-container": "#007255",

  tertiary: "#faf3ff",
  "tertiary-fixed": "#e9ddff",
  "tertiary-fixed-dim": "#d1bcff",
  "tertiary-container": "#e1d2ff",
  "on-tertiary": "#3c0090",
  "on-tertiary-fixed": "#23005b",
  "on-tertiary-fixed-variant": "#5700c9",
  "on-tertiary-container": "#7213ff",

  "on-background": "#e2e2e8",
  "on-surface": "#e2e2e8",
  "on-surface-variant": "#b9cacb",
  "inverse-on-surface": "#2f3035",
  "inverse-surface": "#e2e2e8",

  outline: "#849495",
  "outline-variant": "#3b494b",

  error: "#ffb4ab",
  "error-container": "#93000a",
  "on-error": "#690005",
  "on-error-container": "#ffdad6",
};

export const spacing = {
  xs: 4,
  sm: 12,
  base: 8,
  gutter: 16,
  md: 24,
  lg: 40,
  xl: 64,
  "margin-mobile": 20,
  "margin-desktop": 48,
};

export const borderRadius = {
  DEFAULT: 4,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const typography = {
  "display-lg": { fontSize: 48, lineHeight: 56, fontWeight: "700", letterSpacing: -0.02 },
  "headline-lg": { fontSize: 32, lineHeight: 40, fontWeight: "600", letterSpacing: -0.01 },
  "headline-lg-mobile": { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  "headline-md": { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  "body-lg": { fontSize: 18, lineHeight: 28, fontWeight: "400" },
  "body-md": { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  "mono-data": { fontSize: 14, lineHeight: 20, fontWeight: "700", letterSpacing: 0.02 },
  "label-md": { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.05 },
  "label-sm": { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.1 },
};

export const fontFamily = {
  sans: "Sora",
  mono: "Sora",
};

export const glassStyle = {
  backgroundColor: "rgba(30, 32, 36, 0.6)",
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderTopColor: "rgba(255,255,255,0.1)",
  borderLeftColor: "rgba(255,255,255,0.1)",
  borderRightColor: "rgba(0,0,0,0.2)",
  borderBottomColor: "rgba(0,0,0,0.2)",
  borderRightWidth: 1,
  borderBottomWidth: 1,
} as const;
```

- [ ] **Step 2: Define shared TypeScript types**

Write `packages/shared/src/types/index.ts`:
```typescript
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
```

- [ ] **Step 3: Update shared package entry**

Overwrite `packages/shared/src/index.ts`:
```typescript
export * from "./design/tokens";
export * from "./types";
export * from "./types/database";
export * from "./lib";
```

---

### Task 5: Shared Components — TopAppBar & BottomNav

**Files:**
- Create: `packages/shared/src/ui/TopAppBar.tsx`
- Create: `packages/shared/src/ui/BottomNavBar.tsx`
- Create: `packages/shared/src/ui/GlassPanel.tsx`
- Create: `packages/shared/src/ui/index.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Install shared UI dependencies**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm --filter @parking/shared add \
  react-native \
  expo-font
```

- [ ] **Step 2: Create TopAppBar component**

Write `packages/shared/src/ui/TopAppBar.tsx`:
```typescript
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, typography } from "../design/tokens";
import { MaterialSymbol } from "./MaterialSymbol";

interface TabBarIcon {
  icon: string;
  label: string;
}

interface TopAppBarProps {
  onAvatarPress?: () => void;
  avatarUrl?: string;
  hasNotifications?: boolean;
  onNotificationsPress?: () => void;
}

export function TopAppBar({
  onAvatarPress,
  avatarUrl,
  hasNotifications,
  onNotificationsPress,
}: TopAppBarProps) {
  return (
    <View style={styles.container}>
      {/* Leading: Avatar */}
      <Pressable
        onPress={onAvatarPress}
        style={styles.avatarContainer}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <MaterialSymbol name="person" size={18} color={colors["primary-fixed-dim"]} />
        )}
      </Pressable>

      {/* Brand */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandText}>UniPark</Text>
      </View>

      {/* Trailing: Notifications */}
      <Pressable onPress={onNotificationsPress} style={styles.notifContainer}>
        <MaterialSymbol name="notifications" size={24} color={colors["primary-fixed-dim"]} />
        {hasNotifications && <View style={styles.notifDot} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: "rgba(17, 19, 23, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors["surface-container"],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(132, 148, 149, 0.5)",
    overflow: "hidden",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  brandContainer: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -50 }],
  },
  brandText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors["primary-fixed-dim"],
    fontFamily: "Sora",
  },
  notifContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors["secondary-fixed"],
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
});
```

- [ ] **Step 3: Create MaterialSymbol wrapper** — since we use Material Symbols Outlined font

Write `packages/shared/src/ui/MaterialSymbol.tsx`:
```typescript
import React from "react";
import { Text, StyleSheet } from "react-native";

interface MaterialSymbolProps {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: any;
}

const iconMap: Record<string, string> = {
  person: "",
  notifications: "",
  dashboard: "",
  map: "",
  payments: "",
  qr_code_scanner: "",
  directions_car: "",
  verified: "",
  location_on: "",
  bar_chart: "",
  more_horiz: "",
  campaign: "",
  warning: "",
  chevron_right: "",
  nfc: "",
  emergency: "",
};

export function MaterialSymbol({
  name,
  size = 24,
  color = "#e2e2e8",
  filled = false,
  style,
}: MaterialSymbolProps) {
  const icon = iconMap[name] ?? name;
  return (
    <Text
      style={[
        styles.icon,
        {
          fontSize: size,
          color,
          fontVariationSettings: `'FILL' ${filled ? 1 : 0}`,
        },
        style,
      ]}
    >
      {icon}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: "MaterialSymbolsOutlined",
  },
});
```

- [ ] **Step 4: Create BottomNavBar component**

Write `packages/shared/src/ui/BottomNavBar.tsx`:
```typescript
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, borderRadius } from "../design/tokens";
import { MaterialSymbol } from "./MaterialSymbol";

interface Tab {
  icon: string;
  label: string;
  route: string;
}

interface BottomNavBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (route: string) => void;
}

export function BottomNavBar({ tabs, activeTab, onTabPress }: BottomNavBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.route === activeTab;
        return (
          <Pressable
            key={tab.route}
            onPress={() => onTabPress(tab.route)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <MaterialSymbol
              name={tab.icon}
              size={24}
              color={isActive ? colors["secondary-fixed"] : colors["on-surface-variant"]}
              filled={isActive}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 80,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "rgba(30, 32, 36, 0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 24,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  activeTab: {
    backgroundColor: "rgba(54, 255, 196, 0.2)",
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors["on-surface-variant"],
    opacity: 0.6,
    marginTop: 4,
  },
  activeLabel: {
    color: colors["secondary-fixed"],
    opacity: 1,
  },
});
```

- [ ] **Step 5: Create GlassPanel component**

Write `packages/shared/src/ui/GlassPanel.tsx`:
```typescript
import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { glassStyle, borderRadius } from "../design/tokens";

interface GlassPanelProps extends ViewProps {
  glow?: boolean;
  children: React.ReactNode;
}

export function GlassPanel({ glow, children, style, ...props }: GlassPanelProps) {
  return (
    <View
      style={[
        styles.panel,
        glow && styles.glow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...glassStyle,
    borderRadius: borderRadius.xl,
    padding: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    borderLeftColor: "rgba(255,255,255,0.1)",
    borderRightColor: "rgba(0,0,0,0.2)",
    borderBottomColor: "rgba(0,0,0,0.2)",
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  glow: {
    shadowColor: "rgba(54, 255, 196, 0.25)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
});
```

- [ ] **Step 6: Create UI barrel export**

Write `packages/shared/src/ui/index.ts`:
```typescript
export { TopAppBar } from "./TopAppBar";
export { BottomNavBar } from "./BottomNavBar";
export { GlassPanel } from "./GlassPanel";
export { MaterialSymbol } from "./MaterialSymbol";
```

- [ ] **Step 7: Update shared entry point**

Edit `packages/shared/src/index.ts` — append:
```typescript
export * from "./ui";
```

---

### Task 6: Clerk Auth Integration

**Files:**
- Create: `packages/shared/src/hooks/useAuth.ts`
- Create: `packages/shared/src/lib/clerk-supabase.ts`
- Modify: `apps/driver/app/_layout.tsx`
- Modify: `apps/guard/app/_layout.tsx`

- [ ] **Step 1: Install Clerk and Supabase auth deps in both apps**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm --filter @parking/driver add @clerk/clerk-expo expo-secure-store && \
pnpm --filter @parking/guard add @clerk/clerk-expo expo-secure-store && \
pnpm --filter @parking/shared add @clerk/clerk-expo @supabase/supabase-js
```

- [ ] **Step 2: Create Clerk-to-Supabase bridge in shared**

Write `packages/shared/src/lib/clerk-supabase.ts`:
```typescript
import { supabase } from "./supabase";

export async function exchangeClerkToken(clerkToken: string) {
  const { data, error } = await supabase.functions.invoke("exchange-token", {
    body: { clerkToken },
  });

  if (error) throw error;

  const { supabaseAccessToken } = data as { supabaseAccessToken: string };
  await supabase.auth.setSession({
    access_token: supabaseAccessToken,
    refresh_token: "",
  });
}
```

- [ ] **Step 3: Create useAuth hook**

Write `packages/shared/src/hooks/useAuth.ts`:
```typescript
import { useEffect, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { exchangeClerkToken } from "../lib/clerk-supabase";
import type { UserRole, Profile } from "../types";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user) return;

    async function setupSupabaseSession() {
      try {
        const token = await getToken();
        if (!token) return;

        await exchangeClerkToken(token);

        // Fetch local profile
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_id", user.id)
          .single();

        setProfile(data);
      } catch (err) {
        console.error("Auth setup failed:", err);
      } finally {
        setIsReady(true);
      }
    }

    setupSupabaseSession();
  }, [isSignedIn, user?.id]);

  const role: UserRole | null = profile?.role ?? null;

  return {
    isSignedIn,
    isReady,
    user,
    profile,
    role,
    signOut: () => useClerkAuth().signOut(),
  };
}
```

- [ ] **Step 4: Create hooks barrel**

Write `packages/shared/src/hooks/index.ts`:
```typescript
export { useAuth } from "./useAuth";
```

Append to `packages/shared/src/index.ts`:
```typescript
export * from "./hooks";
```

- [ ] **Step 5: Configure Clerk provider in driver app**

Write `apps/driver/app/_layout.tsx`:
```typescript
import { ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000 },
  },
});

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, token: string) {
    return SecureStore.setItemAsync(key, token);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
```

- [ ] **Step 6: Configure Clerk provider in guard app** — same structure

Write `apps/guard/app/_layout.tsx` (identical to driver's root layout but with guard-specific routes).

- [ ] **Step 7: Create auth route groups**

Run:
```bash
mkdir -p apps/driver/app/"(auth)" apps/driver/app/"(tabs)" && \
mkdir -p apps/guard/app/"(auth)" apps/guard/app/"(tabs)"
```

Write `apps/driver/app/(auth)/_layout.tsx`:
```typescript
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function AuthLayout() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Write `apps/driver/app/(auth)/sign-in.tsx`:
```typescript
import { SignIn } from "@clerk/clerk-expo";

export default function SignInScreen() {
  return <SignIn />;
}
```

---

### Task 7: Driver App — Dashboard Screen

**Files:**
- Create: `apps/driver/app/(tabs)/_layout.tsx`
- Create: `apps/driver/app/(tabs)/dashboard/_layout.tsx`
- Create: `apps/driver/app/(tabs)/dashboard/index.tsx`
- Create: `apps/driver/app/(tabs)/dashboard/alerts.tsx`

- [ ] **Step 1: Create tabs layout for driver app**

Write `apps/driver/app/(tabs)/_layout.tsx`:
```typescript
import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@parking/shared";
import { TopAppBar, BottomNavBar, MaterialSymbol } from "@parking/shared";
import { View } from "react-native";
import { colors } from "@parking/shared";

export default function TabsLayout() {
  const { isSignedIn, isReady } = useAuth();

  if (!isReady) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopAppBar />
      <Tabs
        tabBar={(props) => (
          <BottomNavBar
            tabs={[
              { icon: "dashboard", label: "Status", route: "dashboard" },
              { icon: "map", label: "Map", route: "map" },
              { icon: "payments", label: "Permits", route: "permits" },
              { icon: "qr_code_scanner", label: "Access", route: "access" },
            ]}
            activeTab={props.state.routeNames[props.state.index]}
            onTabPress={(route) => props.navigation.navigate(route)}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="permits" />
        <Tabs.Screen name="access" />
      </Tabs>
    </View>
  );
}
```

- [ ] **Step 2: Create dashboard screen**

Write `apps/driver/app/(tabs)/dashboard/index.tsx`:
```typescript
import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing, typography } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";
import type { Permit, LotOccupancy, ParkingLot } from "@parking/shared";

export default function DashboardScreen() {
  const { profile } = useAuth();

  const { data: permit } = useQuery({
    queryKey: ["activePermit", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("permits")
        .select("*, parking_lots(name), vehicles(plate_number)")
        .eq("profile_id", profile?.id)
        .eq("status", "active")
        .single();
      return data as (Permit & { parking_lots: { name: string }; vehicles: { plate_number: string } }) | null;
    },
    enabled: !!profile?.id,
  });

  const { data: occupancies } = useQuery({
    queryKey: ["lotOccupancy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lot_occupancy")
        .select("*, parking_lots(name, total_spaces)");
      return data as (LotOccupancy & { parking_lots: { name: string; total_spaces: number } })[];
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Permit Hero */}
      <GlassPanel glow style={styles.heroPanel}>
        <View style={styles.heroRow}>
          <View>
            <View style={styles.verifiedRow}>
              <MaterialSymbol name="verified" size={16} color={colors["secondary-fixed"]} filled />
              <Text style={styles.sectionLabel}>Active Permit</Text>
            </View>
            <Text style={styles.permitName}>
              {permit ? permit.parking_lots?.name ?? "No permit" : "No active permit"}
            </Text>
            {permit?.vehicles && (
              <Text style={styles.plateText}>
                EXP: {new Date(permit.expires_at).toLocaleDateString()} • AUTO-RENEW {permit.auto_renew ? "ON" : "OFF"}
              </Text>
            )}
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Valid</Text>
          </View>
        </View>
      </GlassPanel>

      {/* Current Parked Location */}
      <GlassPanel style={styles.locationPanel}>
        <View style={styles.heroRow}>
          <View>
            <View style={styles.verifiedRow}>
              <MaterialSymbol name="location_on" size={16} color={colors["primary-fixed-dim"]} />
              <Text style={styles.sectionLabel}>Current Vehicle</Text>
            </View>
            <Text style={styles.locationText}>Lot B</Text>
            <Text style={styles.spotText}>Spot 42 • Level 2</Text>
          </View>
        </View>
        <Pressable style={styles.findCarButton}>
          <MaterialSymbol name="directions_car" size={20} color={colors["on-primary-fixed"]} />
          <Text style={styles.findCarText}>Find My Car</Text>
        </Pressable>
      </GlassPanel>

      {/* Campus Trends */}
      <GlassPanel style={styles.statsPanel}>
        <View style={styles.statsHeader}>
          <MaterialSymbol name="bar_chart" size={20} color={colors["on-surface-variant"]} />
          <Text style={styles.sectionLabel}>Campus Trends</Text>
        </View>
        {occupancies?.map((occ) => {
          const pct = occ.parking_lots?.total_spaces
            ? Math.round((occ.current_count / occ.parking_lots.total_spaces) * 100)
            : 0;
          const barColor = pct > 90 ? colors.error : colors["secondary-fixed"];
          return (
            <View key={occ.lot_id} style={styles.statBar}>
              <View style={styles.statLabelRow}>
                <Text style={styles.statLabel}>{occ.parking_lots?.name ?? "Unknown"}</Text>
                <Text style={[styles.statPct, { color: barColor }]}>{pct}% Full</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        })}
      </GlassPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"], paddingBottom: 100, gap: spacing.md },
  heroPanel: { overflow: "hidden" },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sectionLabel: { fontSize: 14, fontWeight: "500", color: colors["on-surface-variant"], textTransform: "uppercase", letterSpacing: 2 },
  permitName: { fontSize: 48, fontWeight: "700", color: colors["on-background"], marginTop: 4 },
  plateText: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"], letterSpacing: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(54,255,196,0.1)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(54,255,196,0.3)" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors["secondary-fixed"] },
  statusText: { fontSize: 14, fontWeight: "500", color: colors["secondary-fixed"] },
  locationPanel: {},
  locationText: { fontSize: 32, fontWeight: "600", color: colors["on-background"] },
  spotText: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"] },
  findCarButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors["primary-fixed"], paddingVertical: 12, borderRadius: 8, marginTop: 24 },
  findCarText: { fontSize: 14, fontWeight: "500", color: colors["on-primary-fixed"] },
  statsPanel: {},
  statsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  statBar: { marginBottom: spacing.sm },
  statLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: "600", color: colors["on-background"] },
  statPct: { fontSize: 12, fontWeight: "600" },
  progressTrack: { height: 6, backgroundColor: colors["surface-variant"], borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
});
```

- [ ] **Step 3: Create alerts screen**

Write `apps/driver/app/(tabs)/dashboard/alerts.tsx`:
```typescript
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@parking/shared";

export default function AlertsScreen() {
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      // Placeholder — in production this would fetch from an alerts/notifications table
      return [
        { id: "1", title: "Lot C Closure Tomorrow", body: "Lot C will be closed for repaving starting 06:00 AM. Please use Lot D.", time: "2 hours ago", type: "warning" },
      ];
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>System Alerts</Text>
      {alerts?.map((alert) => (
        <GlassPanel key={alert.id} style={styles.alertCard}>
          <View style={styles.alertRow}>
            <View style={styles.alertIcon}>
              <MaterialSymbol name="campaign" size={16} color={colors.error} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertBody}>{alert.body}</Text>
              <Text style={styles.alertTime}>{alert.time.toUpperCase()}</Text>
            </View>
          </View>
        </GlassPanel>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"], gap: spacing.sm },
  title: { fontSize: 14, fontWeight: "500", color: colors.outline, textTransform: "uppercase", letterSpacing: 2, marginBottom: spacing.sm },
  alertCard: { padding: spacing.sm },
  alertRow: { flexDirection: "row", gap: spacing.sm },
  alertIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(147,0,10,0.2)", alignItems: "center", justifyContent: "center" },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: "500", color: colors["on-background"] },
  alertBody: { fontSize: 14, color: colors["on-surface-variant"], marginTop: 4 },
  alertTime: { fontSize: 12, color: colors.outline, marginTop: 8 },
});
```

---

### Task 8: Driver App — Map, Permits, Access, Vehicle Screens

**Files:**
- Create: `apps/driver/app/(tabs)/map/index.tsx`
- Create: `apps/driver/app/(tabs)/map/[lot].tsx`
- Create: `apps/driver/app/(tabs)/permits/index.tsx`
- Create: `apps/driver/app/(tabs)/permits/buy.tsx`
- Create: `apps/driver/app/(tabs)/permits/[id].tsx`
- Create: `apps/driver/app/(tabs)/access/index.tsx`
- Create: `apps/driver/app/vehicle.tsx`

- [ ] **Step 1: Create Map screen**

Write `apps/driver/app/(tabs)/map/index.tsx`:
```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { supabase, colors, spacing } from "@parking/shared";
import { router } from "expo-router";
import type { ParkingLot, LotOccupancy } from "@parking/shared";

export default function MapScreen() {
  const { data: lots } = useQuery({
    queryKey: ["lotsWithOccupancy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parking_lots")
        .select("*, lot_occupancy(current_count)")
        .eq("is_active", true);
      return data as (ParkingLot & { lot_occupancy: { current_count: number } | null })[];
    },
  });

  const getMarkerColor = (current: number, total: number) => {
    const pct = current / total;
    if (pct > 0.9) return colors.error;
    if (pct > 0.7) return "#FFB74D"; // amber
    return colors["secondary-fixed"];
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 40.7128,
          longitude: -74.006,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {lots?.map((lot) => {
          if (!lot.latitude || !lot.longitude) return null;
          const current = lot.lot_occupancy?.current_count ?? 0;
          return (
            <Marker
              key={lot.id}
              coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
              pinColor={getMarkerColor(current, lot.total_spaces)}
              onCalloutPress={() => router.push(`/(tabs)/map/${lot.id}`)}
            >
              <Callout>
                <Text style={styles.calloutTitle}>{lot.name}</Text>
                <Text style={styles.calloutSub}>
                  {current}/{lot.total_spaces} spots
                </Text>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  calloutTitle: { fontWeight: "600", fontSize: 14, color: "#000" },
  calloutSub: { fontSize: 12, color: "#666" },
});
```

- [ ] **Step 2: Create Lot detail screen**

Write `apps/driver/app/(tabs)/map/[lot].tsx`:
```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, colors, spacing, typography } from "@parking/shared";
import { supabase } from "@parking/shared";

export default function LotDetailScreen() {
  const { lot } = useLocalSearchParams<{ lot: string }>();

  const { data } = useQuery({
    queryKey: ["lot", lot],
    queryFn: async () => {
      const { data } = await supabase
        .from("parking_lots")
        .select("*, lot_occupancy(current_count)")
        .eq("id", lot)
        .single();
      return data;
    },
    enabled: !!lot,
  });

  if (!data) return null;
  const occupancy = (data as any).lot_occupancy;
  const pct = Math.round((occupancy?.current_count ?? 0) / data.total_spaces * 100);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: data.name }} />
      <GlassPanel glow style={styles.card}>
        <Text style={styles.lotName}>{data.name}</Text>
        <Text style={styles.occupancy}>
          {occupancy?.current_count ?? 0} / {data.total_spaces} occupied ({pct}%)
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing["margin-mobile"] },
  card: {},
  lotName: { fontSize: 32, fontWeight: "600", color: colors["primary-fixed"] },
  occupancy: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"], marginTop: 8, letterSpacing: 1 },
  progressTrack: { height: 6, backgroundColor: colors["surface-variant"], borderRadius: 3, marginTop: spacing.sm },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: colors["secondary-fixed"] },
});
```

- [ ] **Step 3: Create Permits list screen**

Write `apps/driver/app/(tabs)/permits/index.tsx`:
```typescript
import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function PermitsScreen() {
  const { profile } = useAuth();

  const { data: permits } = useQuery({
    queryKey: ["permits", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("permits")
        .select("*, parking_lots(name), vehicles(plate_number)")
        .eq("profile_id", profile?.id)
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: !!profile?.id,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.buyButton} onPress={() => router.push("/(tabs)/permits/buy")}>
        <MaterialSymbol name="payments" size={20} color={colors["on-primary-fixed"]} />
        <Text style={styles.buyText}>Buy New Permit</Text>
      </Pressable>

      {permits?.map((permit: any) => (
        <GlassPanel
          key={permit.id}
          style={styles.permitCard}
          onTouchEnd={() => router.push(`/(tabs)/permits/${permit.id}`)}
        >
          <View style={styles.permitRow}>
            <View>
              <Text style={styles.permitLot}>{permit.parking_lots?.name ?? "Unknown"}</Text>
              <Text style={styles.permitPlate}>{permit.vehicles?.plate_number ?? "No vehicle"}</Text>
            </View>
            <View style={[styles.statusBadge, permit.status === "active" && styles.activeBadge]}>
              <Text style={styles.statusText}>{permit.status}</Text>
            </View>
          </View>
          <Text style={styles.permitDates}>
            {new Date(permit.starts_at).toLocaleDateString()} — {new Date(permit.expires_at).toLocaleDateString()}
          </Text>
        </GlassPanel>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"], paddingBottom: 100, gap: spacing.sm },
  buyButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors["primary-fixed"], paddingVertical: 16, borderRadius: 12,
    shadowColor: "rgba(125,244,255,0.4)", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 20,
  },
  buyText: { fontSize: 14, fontWeight: "500", color: colors["on-primary-fixed"] },
  permitCard: {},
  permitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  permitLot: { fontSize: 18, fontWeight: "600", color: colors["on-background"] },
  permitPlate: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"], letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: colors["surface-variant"] },
  activeBadge: { backgroundColor: "rgba(54,255,196,0.2)", borderWidth: 1, borderColor: "rgba(54,255,196,0.3)" },
  statusText: { fontSize: 12, fontWeight: "600", color: colors["on-surface-variant"], textTransform: "uppercase" },
  permitDates: { fontSize: 12, color: colors.outline, marginTop: 8, letterSpacing: 0.5 },
});
```

- [ ] **Step 4: Create Buy Permit screen (with payment stub)**

Write `apps/driver/app/(tabs)/permits/buy.tsx`:
```typescript
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function BuyPermitScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [step, setStep] = useState<"lot" | "vehicle" | "confirm">("lot");

  const { data: lots } = useQuery({
    queryKey: ["activeLots"],
    queryFn: async () => {
      const { data } = await supabase.from("parking_lots").select("*").eq("is_active", true);
      return data;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["myVehicles", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("profile_id", profile?.id);
      return data;
    },
    enabled: !!profile?.id,
  });

  const buyMutation = useMutation({
    mutationFn: async () => {
      // Stubbed payment — just creates the permit directly
      const { data, error } = await supabase
        .from("permits")
        .insert({
          profile_id: profile!.id,
          vehicle_id: selectedVehicle!,
          lot_id: selectedLot!,
          status: "active",
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          payment_status: "paid",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      router.back();
    },
    onError: () => {
      Alert.alert("Error", "Could not create permit. Try again.");
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step indicator */}
      <View style={styles.steps}>
        {["lot", "vehicle", "confirm"].map((s, i) => (
          <View key={s} style={[styles.stepDot, step === s && styles.stepActive]} />
        ))}
      </View>

      {step === "lot" && lots?.map((lot) => (
        <GlassPanel
          key={lot.id}
          style={[styles.option, selectedLot === lot.id && styles.optionSelected]}
          onTouchEnd={() => { setSelectedLot(lot.id); setStep("vehicle"); }}
        >
          <Text style={styles.optionTitle}>{lot.name}</Text>
          <Text style={styles.optionSub}>{lot.total_spaces} total spaces</Text>
        </GlassPanel>
      ))}

      {step === "vehicle" && vehicles?.map((v) => (
        <GlassPanel
          key={v.id}
          style={[styles.option, selectedVehicle === v.id && styles.optionSelected]}
          onTouchEnd={() => { setSelectedVehicle(v.id); setStep("confirm"); }}
        >
          <Text style={styles.optionTitle}>{v.plate_number}</Text>
          <Text style={styles.optionSub}>{v.make} {v.model} • {v.color}</Text>
        </GlassPanel>
      ))}

      {step === "confirm" && (
        <GlassPanel glow style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Confirm Purchase</Text>
          <Text style={styles.confirmText}>
            Lot: {lots?.find((l) => l.id === selectedLot)?.name}
          </Text>
          <Text style={styles.confirmText}>
            Vehicle: {vehicles?.find((v) => v.id === selectedVehicle)?.plate_number}
          </Text>
          <Text style={styles.confirmText}>Duration: 90 days</Text>
          <Text style={styles.confirmPrice}>Amount: $0.00 (stubbed)</Text>
          <Pressable
            style={[styles.confirmButton, buyMutation.isPending && { opacity: 0.5 }]}
            onPress={() => buyMutation.mutate()}
            disabled={buyMutation.isPending}
          >
            <MaterialSymbol name="payments" size={20} color={colors["on-primary-fixed"]} />
            <Text style={styles.confirmButtonText}>
              {buyMutation.isPending ? "Processing..." : "Confirm & Pay"}
            </Text>
          </Pressable>
        </GlassPanel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"], gap: spacing.sm },
  steps: { flexDirection: "row", gap: spacing.base, justifyContent: "center", marginBottom: spacing.md },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors["surface-variant"] },
  stepActive: { backgroundColor: colors["secondary-fixed"] },
  option: {},
  optionSelected: { borderColor: colors["secondary-fixed"], borderWidth: 2 },
  optionTitle: { fontSize: 18, fontWeight: "600", color: colors["on-background"] },
  optionSub: { fontSize: 14, color: colors["on-surface-variant"], marginTop: 4 },
  confirmCard: { alignItems: "center" },
  confirmTitle: { fontSize: 24, fontWeight: "600", color: colors["on-background"] },
  confirmText: { fontSize: 14, color: colors["on-surface-variant"], marginTop: 4 },
  confirmPrice: { fontSize: 18, fontWeight: "600", color: colors["secondary-fixed"], marginTop: spacing.sm },
  confirmButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors["primary-fixed"], paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 12, marginTop: spacing.md, width: "100%",
  },
  confirmButtonText: { fontSize: 14, fontWeight: "500", color: colors["on-primary-fixed"] },
});
```

- [ ] **Step 5: Create Access (Gate) screen with scanner HUD**

Write `apps/driver/app/(tabs)/access/index.tsx`:
```typescript
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { MaterialSymbol, colors, spacing } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function AccessScreen() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse ring animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Scan line animation
    Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    return () => { pulse.stop(); };
  }, []);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.95, 1, 0.95],
  });

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.7, 0.1, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      {/* Authorized Vehicle Card */}
      <View style={styles.authCard}>
        <View style={styles.authRow}>
          <View>
            <Text style={styles.destLabel}>Destination</Text>
            <Text style={styles.destText}>Lot C Entry</Text>
          </View>
          <View style={styles.carIcon}>
            <MaterialSymbol name="directions_car" size={20} color={colors["on-surface-variant"]} />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.authRow}>
          <Text style={styles.destLabel}>Authorized Vehicle</Text>
          <View style={styles.plateBox}>
            <Text style={styles.plateText}>XYZ-9876</Text>
          </View>
        </View>
      </View>

      {/* Scanner HUD */}
      <Pressable style={styles.scannerArea}>
        {/* Outer rings */}
        <View style={[styles.ring, styles.ringOuter]} />
        <View style={[styles.ring, styles.ringMid]} />
        {/* Core scanner */}
        <Animated.View style={[styles.scannerCore, { transform: [{ scale }] }]}>
          {/* Scan line */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-96, 96],
                  }),
                }],
              },
            ]}
          />
          <MaterialSymbol name="nfc" size={64} color={colors["secondary-fixed"]} />
          <Text style={styles.tapText}>Tap to Enter</Text>
        </Animated.View>
      </Pressable>

      {/* Status indicator */}
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>System Ready</Text>
      </View>

      {/* Emergency button */}
      <Pressable style={styles.emergencyButton}>
        <MaterialSymbol name="emergency" size={20} color={colors.error} />
        <Text style={styles.emergencyText}>Need Assistance?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background, alignItems: "center",
    justifyContent: "center", padding: spacing["margin-mobile"],
  },
  ambientGlow: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(54,255,196,0.05)", top: "30%",
  },
  authCard: {
    width: "100%", maxWidth: 400, backgroundColor: "rgba(30,32,36,0.4)",
    borderRadius: 16, padding: 24, marginBottom: 48,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)", borderLeftColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 32,
  },
  authRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  destLabel: { fontSize: 12, fontWeight: "600", color: colors["on-surface-variant"], textTransform: "uppercase", letterSpacing: 2 },
  destText: { fontSize: 24, fontWeight: "600", color: colors["primary-fixed"] },
  carIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors["surface-container-highest"], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(132,148,149,0.5)" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: spacing.sm },
  plateBox: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: colors["outline-variant"] },
  plateText: { fontSize: 14, fontWeight: "700", color: colors["on-surface"], letterSpacing: 3 },
  scannerArea: {
    width: 240, height: 240, alignItems: "center", justifyContent: "center",
    marginBottom: 48, position: "relative",
  },
  ring: {
    position: "absolute", borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(54,255,196,0.2)",
  },
  ringOuter: { width: 300, height: 300 },
  ringMid: { width: 240, height: 240, borderColor: "rgba(54,255,196,0.3)" },
  scannerCore: {
    width: 192, height: 192, borderRadius: 96,
    backgroundColor: "rgba(40,42,46,0.8)",
    borderWidth: 2, borderColor: colors["secondary-fixed"],
    alignItems: "center", justifyContent: "center",
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 40,
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute", left: 0, width: "100%", height: 2,
    backgroundColor: colors["secondary-fixed"],
    shadowColor: colors["secondary-fixed"],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8,
  },
  tapText: {
    fontSize: 14, fontWeight: "700", color: colors["secondary-fixed"],
    letterSpacing: 3, textTransform: "uppercase", marginTop: 12,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 32 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors["secondary-fixed"] },
  statusText: { fontSize: 12, fontWeight: "600", color: colors["on-surface-variant"], letterSpacing: 2, textTransform: "uppercase" },
  emergencyButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999,
    backgroundColor: "rgba(30,32,36,0.5)", marginTop: "auto", marginBottom: 20,
    borderWidth: 1, borderColor: "rgba(255,180,171,0.3)",
  },
  emergencyText: { fontSize: 14, fontWeight: "500", color: colors.error },
});
```

- [ ] **Step 6: Create Vehicle registration screen**

Write `apps/driver/app/vehicle.tsx`:
```typescript
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function AddVehicleScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          profile_id: profile!.id,
          plate_number: plate.toUpperCase(),
          make,
          model,
          color,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVehicles"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message === 'duplicate key value violates unique constraint "vehicles_plate_number_key"'
        ? "This plate is already registered."
        : "Could not register vehicle.");
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPanel style={styles.form}>
        <Text style={styles.label}>Plate Number</Text>
        <TextInput
          style={styles.input}
          value={plate}
          onChangeText={setPlate}
          placeholder="XYZ-1234"
          placeholderTextColor={colors.outline}
          autoCapitalize="characters"
        />
        <Text style={styles.label}>Make</Text>
        <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Toyota" placeholderTextColor={colors.outline} />
        <Text style={styles.label}>Model</Text>
        <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Camry" placeholderTextColor={colors.outline} />
        <Text style={styles.label}>Color</Text>
        <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="Silver" placeholderTextColor={colors.outline} />

        <Pressable
          style={[styles.submitButton, !plate && { opacity: 0.5 }]}
          onPress={() => addMutation.mutate()}
          disabled={!plate || addMutation.isPending}
        >
          <MaterialSymbol name="directions_car" size={20} color={colors["on-primary-fixed"]} />
          <Text style={styles.submitText}>
            {addMutation.isPending ? "Registering..." : "Register Vehicle"}
          </Text>
        </Pressable>
      </GlassPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"] },
  form: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: "600", color: colors["on-surface-variant"], textTransform: "uppercase", letterSpacing: 2 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors["outline-variant"],
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: colors["on-background"], fontFamily: "Sora",
  },
  submitButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors["primary-fixed"], paddingVertical: 16, borderRadius: 12, marginTop: spacing.md,
  },
  submitText: { fontSize: 14, fontWeight: "500", color: colors["on-primary-fixed"] },
});
```

---

### Task 9: Guard App — Scanner & Dashboard

**Files:**
- Create: `apps/guard/app/(tabs)/_layout.tsx`
- Create: `apps/guard/app/(tabs)/scanner/index.tsx`
- Create: `apps/guard/app/(tabs)/scanner/manual.tsx`
- Create: `apps/guard/app/(tabs)/dashboard/index.tsx`
- Create: `apps/guard/app/(tabs)/dashboard/alerts.tsx`

- [ ] **Step 1: Create guard tabs layout**

Write `apps/guard/app/(tabs)/_layout.tsx` — same pattern as driver but with guard-specific tabs:
```typescript
import { Tabs, Redirect } from "expo-router";
import { useAuth, TopAppBar, BottomNavBar, colors } from "@parking/shared";
import { View } from "react-native";

export default function GuardTabsLayout() {
  const { isSignedIn, isReady, role } = useAuth();

  if (!isReady) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (role && role !== "security" && role !== "admin" && role !== "super_admin") {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopAppBar />
      <Tabs
        tabBar={(props) => (
          <BottomNavBar
            tabs={[
              { icon: "qr_code_scanner", label: "Scan", route: "scanner" },
              { icon: "dashboard", label: "Status", route: "dashboard" },
              { icon: "map", label: "Map", route: "map" },
              { icon: "payments", label: "Log", route: "history" },
            ]}
            activeTab={props.state.routeNames[props.state.index]}
            onTabPress={(route) => props.navigation.navigate(route)}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="scanner" />
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="history" />
      </Tabs>
    </View>
  );
}
```

- [ ] **Step 2: Create guard scanner screen**

Write `apps/guard/app/(tabs)/scanner/index.tsx`:
```typescript
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Animated, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { MaterialSymbol, GlassPanel, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScanResult } from "@parking/shared";

export default function GuardScannerScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [scanning]);

  const logScan = useMutation({
    mutationFn: async (result: ScanResult) => {
      const { data, error } = await supabase
        .from("access_logs")
        .insert({
          vehicle_id: result.vehicle!.id,
          permit_id: result.permit?.id ?? null,
          lot_id: result.permit?.lot_id!,
          scanned_by: profile!.id,
          direction: result.direction,
          method: result.method,
          is_valid: result.isValid,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessLogs"] });
      setScanResult(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to log scan.");
    },
  });

  const handleSimulatedScan = async (direction: "entry" | "exit") => {
    setScanning(true);
    // Simulate NFC/QR read — in production this comes from useNFCReader/useQRScanner
    await new Promise((r) => setTimeout(r, 1500));

    // Look up vehicle by plate (simulated)
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*, profiles(full_name)")
      .eq("plate_number", "XYZ-9876")
      .single();

    if (!vehicle) {
      setScanResult({
        vehicle: null, permit: null, isValid: false,
        reason: "Vehicle not found in system",
        direction, method: "qr",
      });
      setScanning(false);
      return;
    }

    const { data: permit } = await supabase
      .from("permits")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("status", "active")
      .single();

    const result: ScanResult = {
      vehicle: vehicle as any,
      permit: permit as any,
      isValid: !!permit,
      reason: permit ? undefined : "No active permit",
      direction,
      method: "qr",
    };

    setScanResult(result);
    setScanning(false);

    if (result.isValid) {
      logScan.mutate(result);
    }
  };

  const scale = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.95, 1, 0.95],
  });

  return (
    <View style={styles.container}>
      {/* Scanner core */}
      <View style={styles.scannerArea}>
        <View style={styles.ring} />
        <Animated.View style={[styles.scannerCore, scanning && { transform: [{ scale }] }]}>
          <MaterialSymbol
            name="qr_code_scanner"
            size={64}
            color={scanResult
              ? (scanResult.isValid ? colors["secondary-fixed"] : colors.error)
              : colors["secondary-fixed"]
            }
            filled
          />
          <Text style={styles.scanLabel}>
            {scanning ? "Reading..." : "Point at QR/NFC"}
          </Text>
        </Animated.View>
      </View>

      {/* Entry/Exit buttons */}
      <View style={styles.directionRow}>
        <Pressable
          style={[styles.dirButton, styles.entryButton]}
          onPress={() => handleSimulatedScan("entry")}
          disabled={scanning}
        >
          <Text style={styles.dirButtonText}>ENTRY</Text>
        </Pressable>
        <Pressable
          style={[styles.dirButton, styles.exitButton]}
          onPress={() => handleSimulatedScan("exit")}
          disabled={scanning}
        >
          <Text style={styles.dirButtonText}>EXIT</Text>
        </Pressable>
      </View>

      {/* Scan result */}
      {scanResult && (
        <GlassPanel glow={scanResult.isValid} style={[styles.resultCard, !scanResult.isValid && styles.resultInvalid]}>
          <Text style={styles.resultTitle}>
            {scanResult.isValid ? "VALID" : "DENIED"}
          </Text>
          {scanResult.vehicle && (
            <Text style={styles.resultPlate}>{scanResult.vehicle.plate_number}</Text>
          )}
          <Text style={styles.resultReason}>
            {scanResult.isValid
              ? `${scanResult.direction.toUpperCase()} logged`
              : scanResult.reason
            }
          </Text>
        </GlassPanel>
      )}

      {/* Manual entry fallback */}
      <Pressable
        style={styles.manualButton}
        onPress={() => router.push("/(tabs)/scanner/manual")}
      >
        <MaterialSymbol name="campaign" size={20} color={colors["on-surface-variant"]} />
        <Text style={styles.manualText}>Manual Entry</Text>
      </Pressable>
    </View>
  );
}

// styles omitted for brevity — same pattern as previous screens, using colors, spacing, and dark theme
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: "center", padding: spacing["margin-mobile"] },
  scannerArea: { width: 240, height: 240, alignItems: "center", justifyContent: "center", marginTop: 40 },
  ring: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: "rgba(54,255,196,0.3)" },
  scannerCore: {
    width: 192, height: 192, borderRadius: 96, backgroundColor: "rgba(40,42,46,0.8)",
    borderWidth: 2, borderColor: colors["secondary-fixed"], alignItems: "center", justifyContent: "center",
    shadowColor: colors["secondary-fixed"], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 40,
  },
  scanLabel: {
    fontSize: 14, fontWeight: "700", color: colors["secondary-fixed"], letterSpacing: 2, marginTop: 12, textTransform: "uppercase",
  },
  directionRow: { flexDirection: "row", gap: spacing.md, marginTop: 40 },
  dirButton: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 12 },
  entryButton: { backgroundColor: colors["secondary-fixed"] },
  exitButton: { backgroundColor: "rgba(54,255,196,0.3)", borderWidth: 1, borderColor: colors["secondary-fixed"] },
  dirButtonText: { fontSize: 14, fontWeight: "700", color: colors["on-secondary-fixed"], letterSpacing: 2 },
  resultCard: { marginTop: 32, alignItems: "center", width: "100%" },
  resultInvalid: { borderColor: "rgba(255,180,171,0.5)", borderWidth: 1 },
  resultTitle: { fontSize: 32, fontWeight: "700", color: colors["on-background"] },
  resultPlate: { fontSize: 18, fontWeight: "700", color: colors["on-surface-variant"], letterSpacing: 3, marginTop: 4 },
  resultReason: { fontSize: 14, color: colors["on-surface-variant"], marginTop: 8 },
  manualButton: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: "auto", marginBottom: 20, padding: 16 },
  manualText: { fontSize: 14, color: colors["on-surface-variant"] },
});
```

- [ ] **Step 3: Create manual entry screen**

Write `apps/guard/app/(tabs)/scanner/manual.tsx`:
```typescript
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function ManualEntryScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [plate, setPlate] = useState("");
  const [direction, setDirection] = useState<"entry" | "exit">("entry");

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Lookup vehicle
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate_number", plate.toUpperCase())
        .single();

      if (!vehicle) throw new Error("Vehicle not found");

      const { data: permit } = await supabase
        .from("permits")
        .select("id, lot_id")
        .eq("vehicle_id", vehicle.id)
        .eq("status", "active")
        .single();

      const is_valid = !!permit;

      const { error } = await supabase.from("access_logs").insert({
        vehicle_id: vehicle.id,
        permit_id: permit?.id ?? null,
        lot_id: permit?.lot_id ?? "00000000-0000-0000-0000-000000000000",
        scanned_by: profile!.id,
        direction,
        method: "manual",
        is_valid,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessLogs"] });
      router.back();
    },
  });

  return (
    <View style={styles.container}>
      <GlassPanel style={styles.form}>
        <Text style={styles.label}>Plate Number</Text>
        <TextInput
          style={styles.input}
          value={plate}
          onChangeText={setPlate}
          placeholder="XYZ-1234"
          placeholderTextColor={colors.outline}
          autoCapitalize="characters"
        />
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, direction === "entry" && styles.toggleActive]}
            onPress={() => setDirection("entry")}
          >
            <Text style={[styles.toggleText, direction === "entry" && styles.toggleActiveText]}>ENTRY</Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, direction === "exit" && styles.toggleActive]}
            onPress={() => setDirection("exit")}
          >
            <Text style={[styles.toggleText, direction === "exit" && styles.toggleActiveText]}>EXIT</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.submitButton, (!plate || submitMutation.isPending) && { opacity: 0.5 }]}
          onPress={() => submitMutation.mutate()}
          disabled={!plate || submitMutation.isPending}
        >
          <Text style={styles.submitText}>Log {direction.toUpperCase()}</Text>
        </Pressable>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing["margin-mobile"] },
  form: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: "600", color: colors["on-surface-variant"], textTransform: "uppercase", letterSpacing: 2 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors["outline-variant"],
    borderRadius: 8, padding: 16, fontSize: 24, fontWeight: "700",
    color: colors["on-background"], letterSpacing: 3, textAlign: "center", fontFamily: "Sora",
  },
  toggleRow: { flexDirection: "row", gap: spacing.sm },
  toggle: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: colors["surface-variant"] },
  toggleActive: { backgroundColor: colors["secondary-fixed"] },
  toggleText: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"] },
  toggleActiveText: { color: colors["on-secondary-fixed"] },
  submitButton: {
    backgroundColor: colors["primary-fixed"], paddingVertical: 16, borderRadius: 12,
    alignItems: "center", marginTop: spacing.md,
  },
  submitText: { fontSize: 14, fontWeight: "500", color: colors["on-primary-fixed"] },
});
```

- [ ] **Step 4: Create guard dashboard screen**

Write `apps/guard/app/(tabs)/dashboard/index.tsx`:
```typescript
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GlassPanel, MaterialSymbol, colors, spacing } from "@parking/shared";
import { supabase } from "@parking/shared";
import { useAuth } from "@parking/shared";

export default function GuardDashboardScreen() {
  const { profile } = useAuth();

  const { data: todayStats } = useQuery({
    queryKey: ["todayScans", profile?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("access_logs")
        .select("*", { count: "exact", head: true })
        .eq("scanned_by", profile?.id)
        .gte("scanned_at", today);

      const { data: occupancy } = await supabase
        .from("lot_occupancy")
        .select("*, parking_lots(name, total_spaces)");

      return { count: count ?? 0, occupancy };
    },
    enabled: !!profile?.id,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPanel glow style={styles.heroCard}>
        <Text style={styles.heroNumber}>{todayStats?.count ?? 0}</Text>
        <Text style={styles.heroLabel}>Scans Today</Text>
      </GlassPanel>

      <Text style={styles.sectionTitle}>Lot Occupancy</Text>
      {todayStats?.occupancy?.map((occ: any) => {
        const pct = occ.parking_lots?.total_spaces
          ? Math.round((occ.current_count / occ.parking_lots.total_spaces) * 100)
          : 0;
        return (
          <GlassPanel key={occ.lot_id} style={styles.occCard}>
            <View style={styles.occRow}>
              <Text style={styles.occName}>{occ.parking_lots?.name ?? "Unknown"}</Text>
              <Text style={styles.occCount}>
                {occ.current_count} / {occ.parking_lots?.total_spaces ?? "?"}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct > 90 ? colors.error : colors["secondary-fixed"] }]} />
            </View>
          </GlassPanel>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing["margin-mobile"], paddingBottom: 100, gap: spacing.sm },
  heroCard: { alignItems: "center" },
  heroNumber: { fontSize: 64, fontWeight: "700", color: colors["secondary-fixed"] },
  heroLabel: { fontSize: 14, fontWeight: "500", color: colors["on-surface-variant"], textTransform: "uppercase", letterSpacing: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "500", color: colors.outline, textTransform: "uppercase", letterSpacing: 2, marginTop: spacing.md },
  occCard: {},
  occRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.base },
  occName: { fontSize: 16, color: colors["on-background"] },
  occCount: { fontSize: 14, fontWeight: "700", color: colors["on-surface-variant"] },
  progressTrack: { height: 6, backgroundColor: colors["surface-variant"], borderRadius: 3 },
  progressFill: { height: "100%", borderRadius: 3 },
});
```

---

### Task 10: NFC/QR Hooks in Shared Package

**Files:**
- Create: `packages/shared/src/hooks/useNFCReader.ts`
- Create: `packages/shared/src/hooks/useQRScanner.ts`
- Modify: `packages/shared/src/hooks/index.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Install NFC and Camera dependencies**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm --filter @parking/driver add expo-camera && \
pnpm --filter @parking/guard add expo-camera
```

- [ ] **Step 2: Create QR scanner hook**

Write `packages/shared/src/hooks/useQRScanner.ts`:
```typescript
import { useState, useCallback } from "react";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import type { GateTagPayload, VehicleQRPayload } from "../types";

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);

  const parseScan = useCallback((result: BarcodeScanningResult): GateTagPayload | VehicleQRPayload | null => {
    try {
      const data = JSON.parse(result.data);
      // Validate structure — must have type field or hmac field
      if ("type" in data && ("entry" in data.type || "exit" in data.type)) {
        return data as GateTagPayload;
      }
      if ("hmac" in data) {
        return data as VehicleQRPayload;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  return {
    scanning,
    setScanning,
    parseScan,
  };
}
```

- [ ] **Step 3: Create NFC reader hook (stub for dev builds — NFC requires physical device)**

Write `packages/shared/src/hooks/useNFCReader.ts`:
```typescript
import { useState, useCallback } from "react";
import type { GateTagPayload } from "../types";

// NFC requires a physical device and expo-dev-client build.
// This hook provides the interface with a stub for Expo Go development.
export function useNFCReader() {
  const [reading, setReading] = useState(false);
  const [lastTag, setLastTag] = useState<GateTagPayload | null>(null);

  const startReading = useCallback(async () => {
    setReading(true);
    // In dev builds with expo-nfc-module:
    // NfcManager.start();
    // NfcManager.registerTagEvent((tag) => { ... });
  }, []);

  const stopReading = useCallback(async () => {
    setReading(false);
    // NfcManager.stop();
  }, []);

  return {
    reading,
    lastTag,
    startReading,
    stopReading,
  };
}
```

- [ ] **Step 4: Update hooks barrel**

Edit `packages/shared/src/hooks/index.ts`:
```typescript
export { useAuth } from "./useAuth";
export { useQRScanner } from "./useQRScanner";
export { useNFCReader } from "./useNFCReader";
```

---

### Task 11: Offline Sync Engine (Guard App)

**Files:**
- Create: `apps/guard/src/sync/syncEngine.ts`
- Create: `apps/guard/src/db/schema.ts`
- Create: `apps/guard/src/db/index.ts`
- Modify: `apps/guard/app/_layout.tsx`

- [ ] **Step 1: Install WatermelonDB**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm --filter @parking/guard add @nozbe/watermelondb @nozbe/with-observables
```

- [ ] **Step 2: Define WatermelonDB schema**

Write `apps/guard/src/db/schema.ts`:
```typescript
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
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
      ],
    }),
  ],
});
```

- [ ] **Step 3: Create sync engine**

Write `apps/guard/src/sync/syncEngine.ts`:
```typescript
import { database } from "../db";
import { supabase } from "@parking/shared";
import NetInfo from "@react-native-community/netinfo";

export class SyncEngine {
  private syncing = false;

  async initialSync() {
    // Pull all active permits for offline validation
    const { data: permits } = await supabase
      .from("permits")
      .select("*, vehicles(plate_number)")
      .eq("status", "active");

    if (permits) {
      await database.write(async () => {
        const permitsCollection = database.get("permits_cache");
        // Clear and repopulate
        await permitsCollection.query().destroyAllPermanently();
        for (const p of permits) {
          await permitsCollection.create((record: any) => {
            record.permit_id = p.id;
            record.vehicle_id = p.vehicle_id;
            record.lot_id = p.lot_id;
            record.plate_number = (p.vehicles as any)?.plate_number ?? "";
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
      const pending = await scanQueue.query().where("synced", false).fetch();

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
        });

        if (!error) {
          await database.write(async () => {
            await (scan as any).update((r: any) => { r.synced = true; });
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

    // Try to sync immediately
    this.pushQueuedScans();
  }
}

export const syncEngine = new SyncEngine();
```

- [ ] **Step 4: Create database instance**

Write `apps/guard/src/db/index.ts`:
```typescript
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { schema } from "./schema";

const adapter = new SQLiteAdapter({
  schema,
  dbName: "parking_guard",
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [],
});
```

---

### Task 12: Environment Variables & EAS Config

**Files:**
- Create: `apps/driver/.env.example`
- Create: `apps/guard/.env.example`
- Create: `apps/driver/app.config.ts`
- Create: `apps/guard/app.config.ts`

- [ ] **Step 1: Create environment variable templates**

Write `apps/driver/.env.example`:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Write `apps/guard/.env.example`:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

- [ ] **Step 2: Create app configs with EAS support**

Write `apps/driver/app.config.ts`:
```typescript
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UniPark Driver",
  slug: "unipark-driver",
  scheme: "unipark-driver",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    backgroundColor: "#111317",
  },
  ios: { supportsTablet: true, bundleIdentifier: "com.unipark.driver" },
  android: { package: "com.unipark.driver", adaptiveIcon: { backgroundColor: "#111317" } },
  plugins: ["expo-router", "expo-font", "expo-secure-store"],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: "unipark-driver" } },
});
```

Write `apps/guard/app.config.ts`:
```typescript
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UniPark Guard",
  slug: "unipark-guard",
  scheme: "unipark-guard",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    backgroundColor: "#111317",
  },
  ios: { supportsTablet: true, bundleIdentifier: "com.unipark.guard" },
  android: { package: "com.unipark.guard", adaptiveIcon: { backgroundColor: "#111317" } },
  plugins: ["expo-router", "expo-font", "expo-secure-store"],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: "unipark-guard" } },
});
```

---

### Task 13: Verify and Run

- [ ] **Step 1: Install all dependencies**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm install
```

Expected: No errors.

- [ ] **Step 2: Start driver app with Expo Go**

Run:
```bash
pnpm --filter @parking/driver start
```

Expected: Expo dev server starts. Scan QR with Expo Go on phone or press 'w' for web.

- [ ] **Step 3: Start guard app with Expo Go**

Run:
```bash
pnpm --filter @parking/guard start
```

Expected: Expo dev server starts on different port.

- [ ] **Step 4: Verify TypeScript compilation**

Run:
```bash
cd /home/fele2/Documents/Proyects/QR-parking-students && \
pnpm --filter @parking/shared exec tsc --noEmit
```

Expected: No type errors.

---

### Task 14: Final Integration & Polish

- [ ] **Step 1: Add font loading to both apps**

Write `apps/driver/app/_layout.tsx` — prepend font loading:
```typescript
// At top of root layout, before ClerkProvider:
import { useFonts } from "expo-font";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";

// Inside component:
const [loaded] = useFonts({
  Sora: require("../assets/fonts/Sora-Regular.ttf"),
  SoraBold: require("../assets/fonts/Sora-Bold.ttf"),
  SoraSemiBold: require("../assets/fonts/Sora-SemiBold.ttf"),
  MaterialSymbolsOutlined: require("../assets/fonts/MaterialSymbolsOutlined.ttf"),
});

useEffect(() => {
  if (loaded) SplashScreen.hideAsync();
}, [loaded]);

if (!loaded) return null;
```

(Repeat for guard app.)

- [ ] **Step 2: Create unauthorized screen for guard app**

Write `apps/guard/app/unauthorized.tsx`:
```typescript
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth, colors } from "@parking/shared";

export default function UnauthorizedScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>
        This account doesn't have access to the Guard app.
      </Text>
      <Pressable style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 40 },
  title: { fontSize: 32, fontWeight: "700", color: colors.error, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors["on-surface-variant"], textAlign: "center", marginBottom: 32 },
  button: { backgroundColor: colors["surface-container-high"], paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  buttonText: { fontSize: 14, fontWeight: "500", color: colors["on-background"] },
});
```

- [ ] **Step 3: Create connectivity status component for guard app**

Write `packages/shared/src/ui/ConnectivityBanner.tsx`:
```typescript
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { colors } from "../design/tokens";

export function ConnectivityBanner({ queueCount }: { queueCount: number }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected && queueCount === 0) return null;

  return (
    <View style={[styles.banner, !isConnected && styles.offline]}>
      <View style={[styles.dot, { backgroundColor: isConnected ? "#FFB74D" : colors.error }]} />
      <Text style={styles.text}>
        {isConnected
          ? `Offline · ${queueCount} queued`
          : "No connection · scans saved locally"
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "rgba(255,183,77,0.15)", marginHorizontal: 20, borderRadius: 8, marginTop: 8,
  },
  offline: { backgroundColor: "rgba(255,180,171,0.15)" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: "600", color: colors["on-surface-variant"] },
});
```

---

## Execution Order

1. Task 1 → Scaffold monorepo (no deps)
2. Task 2 → Supabase schema + migrations (needs Task 1)
3. Task 3 → Edge Function (needs Task 2)
4. Task 4 → Design tokens + types (needs Task 1)
5. Task 5 → Shared UI components (needs Task 4)
6. Task 6 → Clerk auth integration (needs Tasks 4, 5)
7. Task 7 → Driver dashboard screen (needs Tasks 5, 6)
8. Task 8 → Driver remaining screens (needs Task 7)
9. Task 9 → Guard scanner & dashboard (needs Tasks 5, 6)
10. Task 10 → NFC/QR hooks (needs Task 4)
11. Task 11 → Offline sync engine (needs Tasks 9, 10)
12. Task 12 → EAS config (needs Tasks 6, 7, 8, 9)
13. Task 13 → Verify and run (needs all above)
14. Task 14 → Polish (needs Task 13)

Tasks 7 + 9 can run in parallel after Task 6 completes. Task 10 can run in parallel with 7/8/9.
