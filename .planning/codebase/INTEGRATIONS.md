# External Integrations

**Analysis Date:** 2026-04-18

## APIs & External Services

**Meta (Facebook) Marketing API:**
- Meta Marketing API v25.0 (`https://graph.facebook.com/v25.0`)
- Used for: ad account insights (spend, ROAS, CPL, leads, conversions), campaign/adset/ad breakdowns, time-series performance
- Proxy: `api/meta/insights.js` — proxies `GET /act_{id}/insights`
- Account metadata: `api/meta/account.js` — proxies `GET /act_{id}`
- Auth: `META_ACCESS_TOKEN` (env, server-side only, never in browser bundle)
- Ownership enforcement: clients can only query their own `act_id` (validated in serverless handler against Supabase profile)

**Instagram Graph API (via Meta):**
- Instagram Graph API v25.0 (same base URL, `https://graph.facebook.com/v25.0`)
- Used for: account info (followers, biography), post media list, per-media insights (reach, views, saves, shares), account-level insights (reach, interactions, follows), demographic breakdowns (age/gender, country)
- Proxy: `api/meta/ig.js` — proxies `GET /{ig_user_id}[/{endpoint}]`
- Auth: same `META_ACCESS_TOKEN`
- Allowed endpoints allowlisted: `insights`, `media`, `stories`, `media_insights`, `live_media`, `tags`, `mentioned_media`, `mentioned_comment`
- Ownership enforcement: clients can only query their own `ig_user_id`

**Asaas (Payment Gateway):**
- Asaas API v3 (`https://api.asaas.com/v3`)
- Used for: customers CRUD, payments CRUD, subscriptions CRUD, balance, financial transactions
- Proxy: `api/asaas/[...path].js` — catch-all serverless proxy with allowlist
- Auth: `ASAAS_API_KEY` (env, server-side only)
- Restricted to `admin` role only (clients cannot access)
- Blocked paths: `accounts`, `webhooks`, `transfers`, `finance/transfer`
- Mutations logged to Supabase `audit_log` table

**Google Gemini AI:**
- `@google/genai` SDK installed, `GEMINI_API_KEY` injected via Vite `define`
- Not yet wired to any component or hook in `src/` — dependency declared but unused at time of analysis

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_KEY` (serverless)
  - Client: `@supabase/supabase-js` 2.103, singleton in `src/lib/supabase.ts`
  - RLS (Row Level Security) enabled on all tables

**Key Supabase Tables (from migrations):**
- `profiles` — user profiles; columns: `id`, `role` (`admin`|`client`), `client_id`, `full_name`, `username`, `avatar_url`
- `clients` — client accounts; columns: `id`, `name`, `slug`, `act_id` (Meta ad account), `ig_user_id`, `ig_page_id`, `status`
- `goals` — client growth goals (queried via `src/hooks/useGoals.ts`)
- `timeline_events` — client milestone/campaign events (queried via `src/hooks/useTimeline.ts`)
- `sales_data` — normalized ERP sales records (source-agnostic); columns: `client_id`, `integration_type`, `order_id`, `order_date`, `state_code`, `city`, `total_value`, `payment_method`, `seller_id`, `status`, `items` (jsonb), `raw` (jsonb)
- `instagram_followers_history` — daily follower snapshots; upserted by cron `api/cron/ig-snapshot.js`
- `instagram_media_insights_cache` — per-post IG insights cache; columns: `media_id`, `ig_user_id`, `media_type`, `like_count`, `reach`, `views`, `saves`, `shares`
- `client_integrations` — ERP/e-commerce integration configs per client; `config` jsonb field (Tiny, Nuvemshop, Shopify, Bling, WooCommerce planned)
- `audit_log` — mutation log for Asaas proxy operations

**File Storage:**
- Supabase Storage, `avatars` bucket (public read)
  - Users upload to `avatars/<user_id>/...`
  - URL stored in `profiles.avatar_url`

**Caching:**
- `instagram_media_insights_cache` in Supabase — IG per-post insights are cached to stay under API quota
- `useIGMediaCache.ts` hook manages read/write of this cache

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password + Google OAuth)
  - Implementation: `src/contexts/AuthContext.tsx`
  - Session persistence: controlled by `localStorage.mindor_remember` + `sessionStorage.mindor_tab` (custom "remember me" logic)
  - JWT from Supabase session forwarded as `Authorization: Bearer` to all serverless API calls
  - Serverless auth: `api/_lib/auth.js` validates JWT via anon client, fetches role via service client, resolves ownership IDs

**Roles:**
- `admin` — full access to all pages and all API routes
- `client` — restricted to own data; `act_id` and `ig_user_id` are enforced per-request

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.error` / `console.warn` used in API clients (`src/lib/metaApi.ts`, `src/lib/asaas.ts`) for non-fatal failures
- Mutation audit log in Supabase `audit_log` table (Asaas proxy only)

## CI/CD & Deployment

**Hosting:**
- Vercel
  - Static SPA from `dist/` with SPA rewrite rule (all non-`/api/` paths → `index.html`)
  - Serverless functions from `api/` directory (auto-detected by Vercel)
  - Security headers configured globally in `vercel.json` (HSTS, CSP, X-Frame-Options, etc.)

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

## Webhooks & Callbacks

**Incoming:**
- Vercel Cron trigger: `GET /api/cron/ig-snapshot` at `0 3 * * *` (03:00 UTC daily)
  - Auth: `Authorization: Bearer {CRON_SECRET}`
  - Action: snapshots `followers_count` / `follows_count` for every client with `ig_user_id`

**Outgoing:**
- None detected (no webhook dispatch to external services)

## Environment Configuration

**Required env vars (production):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `META_ACCESS_TOKEN`
- `ASAAS_API_KEY`
- `CRON_SECRET`
- `GEMINI_API_KEY` (optional until Gemini is wired up)

**Dev-only:**
- `VITE_ASAAS_API_KEY` — read directly from `.env.local` by `vite.config.ts` to configure the local `/asaas-api` proxy (bypasses serverless auth)

**Secrets location:**
- `.env.local` for local development (gitignored)
- Vercel project environment variables for production

---

*Integration audit: 2026-04-18*
