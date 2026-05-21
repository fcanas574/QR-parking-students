# UniPark Mobile Apps — Design Spec

## Overview

Two Expo (React Native) mobile apps for campus parking management, backed by Supabase and Clerk for auth. This spec covers the mobile apps only; the admin web dashboard is a separate project.

- **Driver App** — Students and Staff: register vehicles, buy permits, view parking map, scan NFC/QR to enter lots
- **Guard App** — Security: scan NFC/QR to log vehicle entry/exit, view lot capacities, manage occupancy

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Expo (React Native) with Expo Router |
| Build & Distribution | EAS Build (dev/prod), Expo Go for development |
| Auth | Clerk (UI + user management + JWT) |
| Backend / DB | Supabase (PostgreSQL, RLS, Realtime, Edge Functions) |
| Server state (Driver) | TanStack Query |
| Local state | Zustand |
| Offline DB (Guard) | WatermelonDB |
| NFC | expo-nfc-module |
| QR | expo-camera (BarCodeScanner) |
| Maps | react-native-maps (or Expo Maps) |
| Payments | Stubbed swappable module (future Stripe-alternative) |
| Design | Stitch design system — dark theme, glassmorphism, Sora font |

## Repo Structure

```
parking-monorepo/
├── apps/
│   ├── driver/          # Expo Router + Clerk + TanStack Query
│   └── guard/           # Expo Router + Clerk + TanStack Query + WatermelonDB
├── packages/
│   └── shared/          # Design system, components, hooks, Supabase client, types
├── supabase/
│   └── migrations/      # Database schema, RLS policies
└── turbo.json
```

- pnpm workspaces + Turborepo
- `packages/shared` is the single source of truth: design tokens, components, Supabase client, generated DB types, NFC/QR hooks
- Both apps import from shared; no code duplication

## Auth Flow

1. User signs in via Clerk (hosted UI)
2. Clerk issues JWT with role claim in metadata
3. Supabase Edge Function `exchange-token` validates Clerk JWT
4. Edge Function generates Supabase session token
5. Client uses Supabase session for all DB calls
6. RLS policies enforce access based on role

Roles are stored as a Clerk metadata field and synced to `profiles.role` on first sign-in.

## Database Schema

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| clerk_id | text UNIQUE | Links to Clerk user |
| full_name | text | |
| role | enum(student, staff, security, admin, super_admin) | |
| email | text | |
| phone | text | |
| avatar_url | text | |
| created_at | timestamptz | |

### vehicles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| profile_id | uuid FK → profiles | |
| plate_number | text UNIQUE | |
| make | text | |
| model | text | |
| color | text | |
| is_verified | boolean | |
| created_at | timestamptz | |

### parking_lots
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | "Lot A", "Lot C" |
| total_spaces | int | |
| location | geography(POINT) | Map coordinate |
| is_active | boolean | |
| created_at | timestamptz | |

### permits
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| profile_id | uuid FK → profiles | |
| vehicle_id | uuid FK → vehicles | |
| lot_id | uuid FK → parking_lots | |
| status | enum(active, expired, suspended, pending_approval) | |
| starts_at | timestamptz | |
| expires_at | timestamptz | |
| payment_status | enum(paid, unpaid, waived) | |
| payment_id | text | External ref (stubbed) |
| auto_renew | boolean | |
| created_at | timestamptz | |

### access_logs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| permit_id | uuid FK → permits (nullable) | |
| vehicle_id | uuid FK → vehicles | |
| lot_id | uuid FK → parking_lots | |
| scanned_by | uuid FK → profiles | Guard who scanned |
| direction | enum(entry, exit) | |
| method | enum(nfc, qr, manual) | |
| is_valid | boolean | Permit status at scan time |
| scanned_at | timestamptz | |
| synced_at | timestamptz | NULL until offline sync |

### lot_occupancy
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lot_id | uuid FK → parking_lots UNIQUE | |
| current_count | int | |
| capacity | int | |
| last_updated | timestamptz | |

Updated by database trigger on access_logs insert.

## RLS Policies

- **Students & Staff**: Read own profile and permits. CRUD own vehicles. Read all parking_lots and lot_occupancy. Read own access_logs.
- **Security**: Read all profiles (plate lookup). Insert access_logs. Read all permits. Read/write lot_occupancy.
- **Admin & Super Admin**: Full access (web app only, not mobile).

## Driver App — Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| (auth)/sign-in | Clerk hosted | Sign in / sign up |
| (tabs)/dashboard | Active permit hero | Permit status, current location, lot capacity bars |
| (tabs)/dashboard/alerts | System notifications | Lot closures, expiry warnings |
| (tabs)/map | Interactive map | Lot markers color-coded by occupancy |
| (tabs)/map/[lot] | Lot detail | Bottom sheet with capacity, hours |
| (tabs)/permits | Permit list | Active + history |
| (tabs)/permits/buy | Purchase flow | Select lot → vehicle → pay (stubbed) |
| (tabs)/permits/[id] | Permit detail | Renew, cancel, view |
| (tabs)/access | NFC/QR scanner | Animated HUD, tap to enter, plate display |
| vehicle | Add/edit vehicles | Plate, make, model, color |

Bottom tabs: Status, Map, Permits, Access (active tab gets filled icon + glow).

## Guard App — Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| (auth)/sign-in | Clerk hosted | Invite-only sign in |
| (tabs)/scanner | NFC/QR reader | Entry/exit logging, permit validation |
| (tabs)/scanner/manual | Manual entry | Fallback plate entry |
| (tabs)/dashboard | Guard dashboard | Today's scans, occupancy, sync queue status |
| (tabs)/dashboard/alerts | Alerts | Capacity warnings, anomalies |
| (tabs)/map | Map with override | Same map as driver + capacity override |
| history | Scan history | Searchable, filterable log |

Bottom tabs: Scan, Status, Map, Log.

## State Management

### Driver App
- **TanStack Query** for all server data. Stale time: 30s. GC: 5min. Optimistic updates on permit purchase. Rollback on failure.
- **Zustand** for ephemeral UI state: selected map filter, scanner animation state.

### Guard App
- **TanStack Query** for server data when online.
- **WatermelonDB** for local cache: active permits, vehicles, parking_lots.
- **Sync Queue**: access_logs created offline are stored locally with `synced_at = NULL`. Sync engine pushes them FIFO on connectivity.
- **Zustand** for connectivity status and sync queue count.

## Offline Strategy (Guard App)

**Initial sync** at sign-in: pull all active permits, parking_lots, and recent access_logs into WatermelonDB.

**Offline scan**:
1. Read plate/vehicle from NFC or QR
2. Lookup in local WatermelonDB
3. Validate permit (active? correct lot? not already inside?)
4. Show result with green/amber/red ring animation
5. Insert access_log locally (synced_at = NULL)
6. Increment local occupancy count

**Sync on reconnect**:
1. Push queued access_logs (oldest first)
2. Concurrent scan conflict: timestamp wins
3. Pull fresh permits and occupancy
4. Reconcile local state

**Connectivity indicator**: green dot "Online", amber "Offline · N queued", red "Sync failed".

## NFC/QR Protocol

**Gate tags** (printed, passive): `{ "gateId": "lot-c-entry", "lotId": "<uuid>", "type": "entry"|"exit" }`

**Vehicle QR** (driver app generates): `{ "vehicleId": "<uuid>", "permitId": "<uuid>", "timestamp": <unix>, "hmac": "<signature>" }` — HMAC-signed for tamper-proofing. Shared secret in Supabase Edge Function.

**Shared hooks** in `packages/shared`: `useNFCReader` and `useQRScanner` used by both apps.

## Error Handling

- **Network**: Driver shows skeleton + toast after 3 TanStack Query retries. Guard falls back to WatermelonDB.
- **Auth**: Expired Clerk session → redirect to sign-in. Expired Supabase token → silent re-exchange.
- **Role mismatch**: "This account doesn't have access to this app" screen with sign-out.
- **Scan errors**: Invalid tag (red ring), expired permit (yellow ring), wrong lot (message), duplicate scan (override prompt).
- **Payment**: Stubbed — "coming soon" screen. No permit created without confirmed payment.

## Edge Cases

- **Concurrent scans**: Two guards scan same vehicle. Server resolves by timestamp. Both see confirmation.
- **Ghost occupancy**: Vehicle exits without scan. Admin corrects occupancy counts in web dashboard.
- **Multi-vehicle permit**: One vehicle active at a time. Scanning second while first is "inside" is denied.
- **Plate change**: Student updates plate → old invalidated, new linked after verification.

## Payments

Swappable module with a defined interface. Stubbed implementation returns "processing" → "paid" after a simulated delay. The interface:

```typescript
interface PaymentProcessor {
  createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  refundPayment(paymentId: string): Promise<RefundResult>;
}
```

## Top App Bar (Shared)

Glassmorphism backdrop-blur header. Avatar (left), centered "UniPark" brand, notification bell with indicator dot (right). Same component used in both apps.

## Design Tokens

From Stitch design system: dark theme, Sora font family, secondary-fixed (#36ffc4) as accent, rounded corners (4px default, 8px lg, 12px xl), glassmorphism panels with white/10 borders, glow shadows on active elements.
