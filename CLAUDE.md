# QR Parking Students

## Environment

- **Docker must be installed via apt**, not snap. Snap Docker sandboxing breaks Supabase container networking, causing health check failures across multiple containers.
- Supabase CLI v2.100.1 (via nvm)
- Node/pnpm monorepo with Turborepo

## Supabase

Run `supabase start` from repo root. Local services:
- DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- Inbucket: http://127.0.0.1:54324

Config at `supabase/config.toml`.
