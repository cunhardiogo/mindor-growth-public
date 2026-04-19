# Codebase Structure

**Analysis Date:** 2026-04-18

## Directory Layout

```
growth-v2-fresh/
├── api/                        # Vercel serverless functions (ESM JS)
│   ├── _lib/
│   │   └── auth.js             # Shared JWT validation middleware
│   ├── asaas/
│   │   └── [...path].js        # Catch-all Asaas proxy (admin only)
│   ├── cron/
│   │   └── ig-snapshot.js      # Daily IG follower snapshot cron
│   └── meta/
│       ├── account.js          # Meta ad account metadata proxy
│       ├── ig.js               # Instagram Graph API proxy
│       └── insights.js         # Meta Ads insights proxy
├── components/
│   └── ui/                     # Shadcn UI primitives (shared across app)
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── table.tsx
│       └── tabs.tsx
├── lib/                        # Root-level lib (currently empty / reserved)
├── src/
│   ├── adapters/               # Pure transform functions (API → display data)
│   │   ├── asaasAdapter.ts
│   │   ├── instagramAdapter.ts
│   │   └── metaAdapter.ts
│   ├── components/
│   │   └── layout/
│   │       └── AppShell.tsx    # Navigation shell + lazy page routing
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # Session, profile, role
│   │   └── NotificationContext.tsx  # Toast notifications
│   ├── features/               # Feature modules (one per business domain)
│   │   ├── clientes/
│   │   │   └── ClientesPage.tsx
│   │   ├── configuracoes/
│   │   │   └── ConfiguracoesPage.tsx
│   │   ├── faturamento/
│   │   │   └── FaturamentoPage.tsx
│   │   ├── financeiro/
│   │   │   ├── FinanceiroPage.tsx
│   │   │   ├── FinanceiroOverview.tsx
│   │   │   ├── AssinaturasTab.tsx
│   │   │   ├── ClientesFinanceiroTab.tsx
│   │   │   ├── CobrancasTab.tsx
│   │   │   ├── ExtratoTab.tsx
│   │   │   ├── FluxoDeCaixaTab.tsx
│   │   │   └── InadimplenciaTab.tsx
│   │   ├── instagram/
│   │   │   └── InstagramPage.tsx
│   │   ├── marketing/
│   │   │   └── MarketingPage.tsx
│   │   ├── metas/
│   │   │   └── MetasPage.tsx
│   │   ├── overview/
│   │   │   └── OverviewPage.tsx
│   │   └── timeline/
│   │       └── TimelinePage.tsx
│   ├── hooks/                  # React data-fetching hooks
│   │   ├── useAsaasData.ts
│   │   ├── useGoals.ts
│   │   ├── useIGFollowersHistory.ts
│   │   ├── useIGMediaCache.ts
│   │   ├── useInstagramInsightsLive.ts
│   │   ├── useMetaInsightsLive.ts
│   │   ├── usePeriodComparisonLive.ts
│   │   ├── useSalesData.ts
│   │   └── useTimeline.ts
│   ├── lib/                    # Typed API client singletons
│   │   ├── asaas.ts            # Asaas API client + types
│   │   ├── metaApi.ts          # Meta + Instagram API client
│   │   └── supabase.ts         # Supabase singleton client
│   └── pages/
│       └── auth/               # Auth pages (login, register, reset)
│           ├── LoginPage.tsx
│           ├── RegisterPage.tsx
│           └── ResetPasswordPage.tsx
├── supabase/
│   └── migrations/             # SQL migration files (run manually in Supabase SQL editor)
│       ├── 20260418_profiles_username_avatar.sql
│       └── 20260418_sales_ig_cache.sql
├── public/                     # Static assets served by Vite
├── dist/                       # Build output (gitignored in normal projects)
├── index.html                  # SPA entry point
├── vite.config.ts              # Vite config (plugins, proxy, path alias)
├── tsconfig.json               # TypeScript config
├── vercel.json                 # Vercel deployment config (cron, rewrites, headers)
├── package.json
└── components.json             # Shadcn CLI config
```

## Directory Purposes

**`api/`:**
- Purpose: Vercel serverless functions; ALL external secrets live here
- Contains: ESM JS handlers, one file per route; shared middleware in `_lib/`
- Key files: `api/_lib/auth.js` (auth middleware used by every handler)

**`api/_lib/`:**
- Purpose: Shared utilities for serverless handlers
- Contains: `auth.js` — the single auth middleware; all handlers import from here
- Generated: No
- Committed: Yes

**`components/ui/`:**
- Purpose: Shadcn UI primitive components; do not put business logic here
- Contains: Unstyled-then-styled primitives (Button, Card, Input, etc.)
- Note: Located at project root `components/`, NOT under `src/` — import via `@/components/ui/...`

**`src/adapters/`:**
- Purpose: Pure transform functions between raw API payloads and display-ready structures
- Contains: One adapter per integration (Meta, Instagram, Asaas)
- Note: No side effects, no hooks — these are safe to unit test in isolation

**`src/features/{domain}/`:**
- Purpose: All code for a single business page
- Contains: Page component + tab/section sub-components
- Note: Sub-components that are not shared go here, not in `src/components/`

**`src/hooks/`:**
- Purpose: Data fetching and derived state
- Contains: One hook per data concern; expose `{ data, loading, error, refetch? }`

**`src/lib/`:**
- Purpose: Typed singleton clients for external services
- Contains: `supabase.ts`, `metaApi.ts`, `asaas.ts`
- Note: These call the serverless proxies (or Supabase directly); never call external APIs from page components directly

**`src/contexts/`:**
- Purpose: App-wide state via React Context
- Contains: `AuthContext.tsx` (mandatory wrapper), `NotificationContext.tsx`

**`supabase/migrations/`:**
- Purpose: SQL schema migrations for Supabase
- Generated: No
- Committed: Yes
- Note: Applied manually via Supabase SQL editor; no migration runner CLI is configured

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell, mounts `#root`, loads `src/main.tsx`
- `src/main.tsx`: React app bootstrap (AuthProvider, NotificationProvider, BrowserRouter)

**Configuration:**
- `vite.config.ts`: Dev proxy for `/asaas-api`, path alias `@` → project root, Tailwind + React plugins
- `tsconfig.json`: TypeScript settings; path `@/*` maps to root
- `vercel.json`: Cron at `/api/cron/ig-snapshot` (daily 03:00 UTC), SPA rewrite, security headers

**Core Logic:**
- `src/components/layout/AppShell.tsx`: Navigation, role-gating of nav items, all `React.lazy()` page imports
- `src/contexts/AuthContext.tsx`: Session management, "remember me" logic, profile loading
- `api/_lib/auth.js`: Every serverless handler's first call; determines auth/role/ownership

**Supabase Schema:**
- `supabase/migrations/20260418_sales_ig_cache.sql`: `client_integrations`, `sales_data`, `instagram_followers_history`, `instagram_media_insights_cache` tables + RLS
- `supabase/migrations/20260418_profiles_username_avatar.sql`: `profiles.username`, `profiles.avatar_url`, `avatars` storage bucket + policies

## Naming Conventions

**Files:**
- Feature pages: `PascalCase` with `Page` suffix — `OverviewPage.tsx`, `MarketingPage.tsx`
- Feature sub-components (tabs): `PascalCase` with domain prefix — `CobrancasTab.tsx`, `FinanceiroOverview.tsx`
- Hooks: `camelCase` with `use` prefix — `useMetaInsightsLive.ts`, `useAsaasData.ts`
- Adapters: `camelCase` with `Adapter` suffix — `metaAdapter.ts`, `asaasAdapter.ts`
- Serverless handlers: `camelCase.js` — `insights.js`, `ig.js`, `account.js`
- Catch-all serverless route: `[...path].js` (Vercel file-system routing)

**Functions (adapters):**
- Prefix `to` for transform functions: `toMarketingKPIs`, `toPerformanceChart`, `toInstagramKPIs`
- Prefix `fetch` for API call functions: `fetchMetaInsights`, `fetchInstagramInsights`

**Directories:**
- Feature domains: lowercase Portuguese — `financeiro/`, `marketing/`, `clientes/`, `configuracoes/`
- Serverless grouping: lowercase English — `api/meta/`, `api/asaas/`, `api/cron/`

## Where to Add New Code

**New Feature Page:**
- Primary code: `src/features/{domain}/{Domain}Page.tsx`
- Register in AppShell: add `lazy()` import and `case` in `renderPage()` and entry in `navItemsAll` in `src/components/layout/AppShell.tsx`
- Hooks for data: `src/hooks/use{Domain}Data.ts`
- Display transforms: `src/adapters/{domain}Adapter.ts`
- Tests: None currently configured; co-locate alongside component if/when added

**New Serverless Endpoint:**
- Implementation: `api/{group}/{name}.js`
- Always import and call `verifyAuth` from `api/_lib/auth.js` as the first step
- Never expose secrets via query params or response bodies

**New External API Client:**
- Implementation: `src/lib/{service}.ts`
- Must attach Supabase JWT via `supabase.auth.getSession()`
- Route through a serverless proxy — do not call external APIs directly from this layer

**New Supabase Table:**
- SQL: create a new file in `supabase/migrations/` with date prefix (e.g., `20260420_{name}.sql`)
- Always enable RLS and add policies for `admin` and `client` roles

**New Shadcn Component:**
- Location: `components/ui/{component}.tsx`
- Import in consumers as: `import { X } from '@/components/ui/{component}'`

## Special Directories

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (`npm run build`)
- Committed: Present in repo (unusual); normally gitignored

**`api/_lib/`:**
- Purpose: Shared serverless utilities — not a Vercel route (underscore prefix hides from routing)
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents (phases, codebase maps)
- Generated: By GSD tooling
- Committed: Yes

**`.vercel/`:**
- Purpose: Vercel project metadata
- Generated: Yes (by Vercel CLI)
- Committed: Present (contains project ID; safe to commit)

---

*Structure analysis: 2026-04-18*
