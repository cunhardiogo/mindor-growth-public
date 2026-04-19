# Technology Stack

**Analysis Date:** 2026-04-18

## Languages

**Primary:**
- TypeScript 5.8 — all frontend source (`src/**/*.tsx`, `src/**/*.ts`)
- JavaScript (ESM) — all serverless API handlers (`api/**/*.js`)

## Runtime

**Environment:**
- Node.js (inferred from Vercel deployment target)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.0 — UI framework (`src/`)
- React Router DOM 7.14 — client-side routing (SPA mode, single `index.html` entry)
- Vite 6.2 — dev server and build tool (`vite.config.ts`)

**Styling:**
- Tailwind CSS 4.1 (via `@tailwindcss/vite` plugin)
- `tw-animate-css` 1.4 — animation utilities
- `tailwind-merge` 3.5 — conditional class merging
- `class-variance-authority` 0.7 — component variant management

**Animation:**
- `motion` 12.23 (Motion for React, formerly Framer Motion)

**Charts:**
- Recharts 3.8 — all data visualizations (AreaChart, BarChart, PieChart, LineChart)

**Icons:**
- `lucide-react` 0.546 — icon set throughout UI

**UI Primitives:**
- `@base-ui/react` 1.4 — low-level unstyled components
- shadcn components scaffolded into `components/ui/` (Button, Card, Input, Select, Table, Tabs, Badge, Avatar, Separator)

**Testing:**
- None detected

**Build/Dev:**
- `tsx` 4.21 — TypeScript execution for scripts
- `autoprefixer` 10.4 — CSS vendor prefix handling

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.103 — database, auth, storage client
- `react-router-dom` 7.14 — routing (all navigation is client-side SPA)
- `recharts` 3.8 — all charts; removal would break every dashboard page
- `motion` 12.23 — used extensively for animations and transitions

**AI (declared, not yet wired in source):**
- `@google/genai` 1.29 — Gemini AI SDK; in `package.json` but no usage found in `src/`; `GEMINI_API_KEY` is injected via `vite.config.ts` `define`

**Infrastructure:**
- `express` 4.21 — present in dependencies but not used in deployed code (Vercel uses native serverless handlers); appears to be a development/local proxy artifact

## Configuration

**Environment:**
- Frontend variables prefixed `VITE_` (loaded by Vite)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key
- `GEMINI_API_KEY` — injected as `process.env.GEMINI_API_KEY` via Vite define
- API (serverless) variables loaded server-side (no `VITE_` prefix required):
  - `META_ACCESS_TOKEN` — Meta Marketing API token (never exposed to browser)
  - `ASAAS_API_KEY` — Asaas payment API key (never exposed to browser)
  - `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
  - `CRON_SECRET` — secret for Vercel Cron authentication

**Build:**
- `vite.config.ts` — Vite config with React plugin, Tailwind plugin, path alias `@` → project root, local dev proxy for `/asaas-api`
- `tsconfig.json` — TypeScript strict mode targeting ES2022, bundler module resolution
- `vercel.json` — deployment config with cron schedule, SPA rewrites, security headers

## Platform Requirements

**Development:**
- `.env.local` file required with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ASAAS_API_KEY` (dev proxy only)
- Run: `npm run dev` (Vite on port 3000, binds `0.0.0.0`)

**Production:**
- Vercel (inferred from `vercel.json` and `api/` serverless function structure)
- All env vars set in Vercel project settings
- `npm run build` → `dist/` served as static SPA

---

*Stack analysis: 2026-04-18*
