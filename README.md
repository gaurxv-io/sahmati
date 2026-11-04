# Sahmati

DPDP compliance for Indian schools: parent consent on WhatsApp, a tamper-evident consent ledger, parent-rights requests, and the DPDP Ready School badge.

Live: https://gaurxv-io.github.io/sahmati/

Routes: `/` (site), `/login`, `/app` (console: students, requests, ledger, report, settings), `/c/:studentId` (parent consent), `/verify/:receipt` (public receipt check).

## Stack

- TanStack Start in SPA mode (React, Tailwind), built as static files for GitHub Pages.
- Supabase (project `oncckgkeauzabgmqzvwg`, Mumbai) for the database, login and file storage. All business logic lives in Postgres functions; tables are protected by Row Level Security.

## Run locally

```bash
export PATH="$HOME/.local/opt/node/bin:$HOME/.local/opt/gh/bin:$PATH"
bun install
bun run dev        # http://localhost:3000/sahmati/
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`).

## Database

Schema: `drizzle/migrations/0000`–`0004`, then `supabase/manual/0005_otp_request.sql` and `0006_storage_bucket.sql`. To set up a fresh Supabase project, run them in order in the SQL editor.

## Not real yet

- Parent OTP is shown on screen for demo schools; real schools need an SMS sender (for example a Supabase Edge Function calling MSG91).
- WhatsApp buttons open a pre-filled chat instead of the WhatsApp Business API.
- The privacy notice drafter fills a template; other languages must be translated by staff.
