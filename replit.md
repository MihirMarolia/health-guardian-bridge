# Health Guardian

Enterprise-grade, clinician-first clinical triage platform. Centralises document triage with human-in-the-loop AI verification, PHI de-identification, and immutable audit logging.

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Express + tRPC (TypeScript, `tsx` dev server)
- **Database**: Supabase (PostgreSQL, RLS policies enforced)
- **Auth/Storage**: Supabase Auth + S3-compatible storage

## Running the app

```bash
PORT=5000 pnpm dev
```

The workflow **Start application** is configured in Replit and runs this command automatically.

## Required secrets

| Secret | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |

## Optional secrets

| Secret | Purpose |
|---|---|
| `VITE_ANALYTICS_ENDPOINT` | Umami analytics endpoint (app works without it) |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami analytics site ID (app works without it) |

## Key routes

- `/` — Landing page
- `/clinician` — Clinician inbox (referral triage)

## Database setup

Run `drizzle/0000_first_justice.sql` and `supabase-rls-policies.sql` in the Supabase SQL Editor to create tables and enable RLS policies. See `DEPLOYMENT.md` for the full guide.

## User preferences

_None recorded yet._
