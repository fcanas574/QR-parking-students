# UniPark

Campus parking management system with two mobile apps — **Driver** (students/staff) and **Guard** (security personnel) — backed by Supabase and Clerk authentication.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 (React 19, React Native 0.81) |
| Navigation | Expo Router v6 (file-based) |
| Auth | Clerk + custom Supabase token exchange |
| Database | Supabase (PostgreSQL 17, RLS, Edge Functions) |
| State | TanStack Query v5, Zustand v5 |
| Monorepo | pnpm workspaces + Turborepo |
| Offline (Guard) | expo-sqlite with queue-and-sync |

## Architecture

```
parking-monorepo/
├── apps/
│   ├── driver/          # @parking/driver — student/staff app
│   └── guard/           # @parking/guard  — security personnel app
├── packages/
│   └── shared/          # @parking/shared — types, design tokens, hooks, UI
├── supabase/
│   ├── config.toml      # Local Supabase configuration
│   ├── migrations/      # Database schema (enums, tables, RLS, seed data)
│   └── functions/
│       └── exchange-token/  # Clerk → Supabase JWT edge function
└── turbo.json           # Turborepo pipeline
```

### Auth Flow

1. User signs in via Clerk (email/password) in the mobile app
2. App calls `exchangeClerkToken()` which invokes the Supabase Edge Function
3. Edge Function verifies the Clerk JWT, upserts a profile, and signs a Supabase-compatible JWT
4. Client sets the Supabase session — all subsequent queries use this JWT for RLS

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10.4
- **Docker** — installed via your OS package manager (e.g. `apt` on Ubuntu). **Do not use the Snap version** — its sandboxing breaks Supabase container networking.
- **Supabase CLI** v2.100.1+
- **Clerk account** — [clerk.com](https://clerk.com) (free tier works)

## Installation

### 1. Install pnpm

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
```

Or install directly:

```bash
npm install -g pnpm@10.4.1
```

### 2. Install Supabase CLI

```bash
# Via nvm (recommended)
nvm install --lts
npm install -g supabase

# Or via Homebrew (macOS)
brew install supabase/tap/supabase
```

Verify:

```bash
supabase --version
```

### 3. Install project dependencies

```bash
pnpm install
```

### 4. Install Docker

**Ubuntu/Debian (apt — required):**

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

**macOS:**

Download [Docker Desktop](https://www.docker.com/products/docker-desktop/).

> **Warning:** On Ubuntu, do **not** install Docker via Snap. The Snap sandbox prevents Supabase containers from communicating, causing health check failures across multiple containers.

## Environment Setup

### 1. Start Supabase

```bash
supabase start
```

This spins up local Docker containers for PostgreSQL, the PostgREST API, Studio, and Inbucket. On first run it applies all migrations and seeds the database.

Once running, note the output — it prints the keys you'll need:

```
API URL: http://127.0.0.1:54321
DB URL:  postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio:  http://127.0.0.1:54323
anon key: eyJhbGciOi...
```

### 2. Set up Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Enable **Email** as a sign-in method
3. Under **API Keys**, copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
4. Under **API Keys**, copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

You'll also need the **JWT template** for Supabase:

1. In the Clerk dashboard, go to **JWT Templates**
2. Create a new template named `supabase` (or use the default)
3. Set the signing algorithm to **HS256**
4. Copy the **Signing Key** — this is your `SUPABASE_AUTH_JWT_SECRET`

**Assigning roles:** Clerk stores the user role in `public_metadata.role`. Set this via the Clerk dashboard on each user:

- `student` — default, can manage own vehicles and permits
- `security` — can access the Guard app and scan QR codes
- `admin` / `super_admin` — full access

### 3. Export secrets for Supabase

The `config.toml` uses `env(...)` to inject secrets into the edge runtime. These must be **exported in your shell** before starting Supabase — `supabase/.env.local` does **not** work for local edge functions.

```bash
export CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
export SUPABASE_AUTH_JWT_SECRET=your_jwt_signing_secret_min_32_chars
```

To persist these across terminal sessions, add them to your shell profile:

```bash
# ~/.zshrc (or ~/.bashrc)
export CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
export SUPABASE_AUTH_JWT_SECRET=your_jwt_signing_secret_min_32_chars
```

Then reload:

```bash
source ~/.zshrc
```

These are referenced by `config.toml` under `[edge_runtime.secrets]` and injected into the `exchange-token` edge function at runtime.

> **Important:** Never commit secrets to git. Confirm they only exist in your shell profile and `.env` files (all of which are gitignored).

### 4. Create app `.env` files

Both apps need the same three environment variables. Copy the template into each app:

```bash
# Driver app
cp apps/driver/.env.example apps/driver/.env

# Guard app
cp apps/guard/.env.example apps/guard/.env
```

Then fill in the values:

```bash
# apps/driver/.env  (and apps/guard/.env)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...             # from `supabase start` output
```

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `EXPO_PUBLIC_SUPABASE_URL` | `supabase start` output (API URL) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `supabase start` output (anon key) |

### 5. Start Supabase with secrets

With the secrets exported, start (or restart) Supabase so the edge function picks them up:

```bash
supabase stop
supabase start
```

Verify the edge function is loaded:

```bash
supabase functions list
```

## Running the Apps

```bash
# Driver app (students/staff)
pnpm dev:driver

# Guard app (security personnel)
pnpm dev:guard
```

Each command starts the Expo dev server. Press the on-screen shortcut or connect a device:

- `i` — iOS simulator
- `a` — Android emulator
- `w` — Web browser

### Other commands

```bash
pnpm build          # Build all packages via Turborepo
pnpm lint           # Lint all packages
```

## Local Services

| Service | URL |
|---------|-----|
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Inbucket (email) | http://127.0.0.1:54324 |

## Database

Migrations are applied automatically by `supabase start`. To reset and re-seed:

```bash
supabase db reset
```

The schema includes four migration files:

1. `00001_schema.sql` — Enums, tables, and indexes
2. `00002_triggers.sql` — Occupancy update trigger, profile upsert function
3. `00003_rls.sql` — Row Level Security policies (role-based)
4. `00004_seed_data.sql` — 4 sample parking lots with occupancy rows

### Role-Based Access

| Role | Access |
|------|--------|
| `student` | Own vehicles, permits, and access logs |
| `security` | All access logs, scan QR/barcodes, dashboard |
| `admin` | Full management access |
| `super_admin` | Full management access |

## Project Structure

### Driver App (`apps/driver`)

- **Dashboard** — Active permit, current location, campus trends
- **Map** — Parking lot markers with real-time occupancy
- **Permits** — List, purchase, and detail views
- **Access** — NFC/QR scanner

### Guard App (`apps/guard`)

- **Scanner** — QR/barcode scanning with entry/exit logging
- **Manual Entry** — License plate entry with direction toggle
- **Dashboard** — Scan count, lot occupancy bars
- **Alerts** — Capacity warnings
- **Offline** — SQLite cache with queue-and-sync for disconnected scanning

### Shared Package (`packages/shared`)

- **Design tokens** — Color palette, typography (Sora), spacing, glassmorphism styles
- **Types** — Supabase database types, navigation routes, scan/payment interfaces
- **Hooks** — `useAuth` (Clerk + Supabase session), `useQRScanner`, `useNFCReader`
- **UI components** — TopAppBar, BottomNavBar, GlassPanel, MaterialSymbol, ConnectivityBanner
- **Lib** — Supabase client, `exchangeClerkToken()`

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Supabase containers fail health checks | Ensure Docker is installed via `apt`, not Snap |
| `supabase` command not found | Install via `npm install -g supabase` or Homebrew |
| Edge function returns 500 | Verify `CLERK_SECRET_KEY` and `SUPABASE_AUTH_JWT_SECRET` in `supabase/.env.local`, then `supabase stop && supabase start` |
| `pnpm install` fails | Ensure Node >= 20 and pnpm >= 10.4 (`node -v`, `pnpm -v`) |
| Metro bundler errors | Run `pnpm install` from the repo root (hoisted node_modules) |
| Auth redirect loop | Check that `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_SUPABASE_URL` match your Clerk app and local Supabase instance |
