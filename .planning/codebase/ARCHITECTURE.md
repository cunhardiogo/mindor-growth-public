# Architecture

**Analysis Date:** 2026-04-18

## Pattern Overview

**Overall:** Feature-sliced SPA with Vercel serverless API proxy layer

**Key Characteristics:**
- Single-page React app (one `index.html`, client-side routing via React Router)
- All external API secrets live exclusively in Vercel serverless functions (`api/`); browser never touches Meta or Asaas directly
- Feature modules under `src/features/` own their page component; routing is centralized in `src/components/layout/AppShell.tsx`
- Data flows from external APIs through serverless proxies → custom hooks → adapter functions → page components
- Two roles (`admin`, `client`) gate both UI navigation and API access; role is resolved on every serverless request by `api/_lib/auth.js`

## Layers

**Serverless API Proxy (`api/`):**
- Purpose: Keep secrets server-side, enforce ownership, proxy to Meta Graph API and Asaas
- Location: `api/`
- Contains: Vercel serverless handlers (`*.js` ESM), shared auth middleware (`api/_lib/auth.js`)
- Depends on: Supabase service client (for JWT validation + role lookup), environment secrets
- Used by: Frontend via `fetch('/api/...')` calls in `src/lib/metaApi.ts` and `src/lib/asaas.ts`

**API Client Libraries (`src/lib/`):**
- Purpose: Typed wrappers over the serverless endpoints; attach Supabase JWT to every request
- Location: `src/lib/`
- Contains: `metaApi.ts` (Meta Ads + Instagram), `asaas.ts` (Asaas payment API), `supabase.ts` (singleton client)
- Depends on: Supabase session (for JWT), serverless proxy layer
- Used by: Custom hooks in `src/hooks/`

**Custom Hooks (`src/hooks/`):**
- Purpose: React state management and data fetching; single concern per hook
- Location: `src/hooks/`
- Contains: `useMetaInsightsLive.ts`, `usePeriodComparisonLive.ts`, `useInstagramInsightsLive.ts`, `useIGFollowersHistory.ts`, `useIGMediaCache.ts`, `useAsaasData.ts`, `useSalesData.ts`, `useGoals.ts`, `useTimeline.ts`
- Depends on: `src/lib/` clients, `src/contexts/AuthContext.tsx` (for profile/client IDs)
- Used by: Feature page components

**Adapter / Transform Layer (`src/adapters/`):**
- Purpose: Pure functions that transform raw API payloads into display-ready data structures
- Location: `src/adapters/`
- Contains: `metaAdapter.ts` (KPI cards, charts, funnel, campaign table), `instagramAdapter.ts` (IG KPIs, sparklines), `asaasAdapter.ts` (payment status, subscription display)
- Depends on: Nothing (pure functions, no side effects)
- Used by: Feature page components

**Feature Modules (`src/features/`):**
- Purpose: Self-contained page components, each owned by one business domain
- Location: `src/features/{domain}/`
- Contains: Page component(s) + domain-specific sub-components (tabs, sections)
- Depends on: Hooks, adapters, shared UI components, contexts
- Used by: `AppShell` via `React.lazy()` dynamic imports

**Shared UI (`components/ui/`):**
- Purpose: Shadcn-based primitive components
- Location: `components/ui/`
- Contains: `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `badge.tsx`, `avatar.tsx`, `separator.tsx`
- Depends on: Tailwind, `class-variance-authority`, `tailwind-merge`
- Used by: All feature components and layout

**Contexts (`src/contexts/`):**
- Purpose: React context providers for cross-cutting state
- Location: `src/contexts/`
- Contains: `AuthContext.tsx` (session, profile, role), `NotificationContext.tsx` (toast notifications)
- Depends on: Supabase client
- Used by: All hooks and page components

## Data Flow

**Meta Ads / Instagram Insights:**

1. User selects date range on page → component passes params to hook (`useMetaInsightsLive`)
2. Hook calls `fetchMetaInsights` / `fetchInstagramInsights` in `src/lib/metaApi.ts`
3. Library attaches Supabase JWT (`Authorization: Bearer`) and calls `GET /api/meta/insights` or `/api/meta/ig`
4. Serverless handler validates JWT, checks role/ownership, proxies to `graph.facebook.com/v25.0`
5. Raw response returned to hook; hook stores in local state
6. Page component passes raw data to adapter functions (e.g., `toMarketingKPIs(data)`)
7. Adapter returns typed display objects → rendered by component

**Asaas Financial:**

1. `useAsaasData` hook calls `asaas.payments.list()` / `asaas.subscriptions.list()` from `src/lib/asaas.ts`
2. Library routes request through `/asaas-api/*` (dev: Vite proxy; prod: Vercel rewrite → `/api/asaas/*`)
3. Serverless catch-all validates `admin` role, checks allowlist, forwards to `api.asaas.com/v3`
4. Mutations write to Supabase `audit_log`
5. Data returned → `asaasAdapter.ts` formats for display

**State Management:**
- No global state library (no Redux, Zustand, Jotai)
- All server state in individual hooks via `useState` + `useEffect`
- Auth state in `AuthContext` (React Context)
- UI notifications in `NotificationContext` (React Context)
- No client-side caching beyond React component state (except IG media cache, which uses Supabase as the backing store)

## Key Abstractions

**Auth Context (`AuthProfile`):**
- Purpose: Carries role, profile, and client metadata (including `act_id`, `ig_user_id`) throughout the app
- Examples: `src/contexts/AuthContext.tsx`
- Pattern: React Context + Provider wrapping the entire app; consumed via `useAuth()` hook

**Serverless Auth Middleware:**
- Purpose: Reusable JWT validation + role resolution for all serverless handlers
- Examples: `api/_lib/auth.js`
- Pattern: `verifyAuth(req, allowedRoles)` returns `{ ok, role, profile }` — every handler calls this first

**Adapter Functions:**
- Purpose: Decouple raw API shape from component rendering logic; keep pages clean
- Examples: `src/adapters/metaAdapter.ts`, `src/adapters/instagramAdapter.ts`, `src/adapters/asaasAdapter.ts`
- Pattern: Pure functions — `toMarketingKPIs(data, timeSeries, prev?)`, `toInstagramKPIs(insights, prev?)`

**AbortController pattern in hooks:**
- Purpose: Cancel in-flight requests when params change (prevents stale data races)
- Examples: `src/hooks/useMetaInsightsLive.ts` — `controllerRef` pattern with `useCallback` dependency array
- Pattern: Store `AbortController` in `useRef`, abort previous before starting new fetch

## Entry Points

**Application Bootstrap:**
- Location: `src/main.tsx` (inferred from `index.html` script src)
- Triggers: Browser loads `index.html` → Vite injects module script
- Responsibilities: Mount React app, wrap with `AuthProvider`, `NotificationProvider`, `BrowserRouter`

**Shell / Router:**
- Location: `src/components/layout/AppShell.tsx`
- Triggers: Authenticated user lands on any route
- Responsibilities: Navigation sidebar, role-based nav item filtering, lazy-loading all feature pages via `React.lazy()` + `Suspense`

**Auth Pages:**
- Location: `src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`
- Triggers: Unauthenticated route or direct navigation
- Responsibilities: Email/password sign-in, "remember me" toggle, password reset flow (Supabase magic link)

## Error Handling

**Strategy:** Graceful degradation — API errors are caught per-hook and surfaced as local `error` state strings; components render empty/skeleton states rather than crashing.

**Patterns:**
- Hooks expose `{ data, loading, error }` — pages check `error` and show inline error messages
- Adapter functions use `?.` optional chaining and `?? 0` defaults for all raw API fields (prevents crashes on missing data)
- Serverless handlers return typed JSON error objects `{ error: string }` with appropriate HTTP status codes
- IG media insights failures per-post are silently swallowed (archived posts may reject insights); logged via `console.warn`
- `AuthContext` has a 5-second safety timeout to prevent infinite loading if Supabase is unreachable

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` in API client functions; no structured logging library

**Validation:**
- Server-side: `ig_user_id` validated as numeric in `api/meta/ig.js`; endpoint validated against allowlist; Asaas paths validated against allowlist/blocklist
- Client-side: email regex in `LoginPage.tsx`; no form library

**Authentication:** Supabase JWT forwarded on every API call; role enforced both in UI (nav item `adminOnly` flag in `AppShell`) and in each serverless handler via `verifyAuth`

---

*Architecture analysis: 2026-04-18*
