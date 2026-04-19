# Coding Conventions

**Analysis Date:** 2026-04-18

## Naming Patterns

**Files:**
- React pages/features: PascalCase, suffixed with `Page` — `OverviewPage.tsx`, `FinanceiroPage.tsx`
- React sub-components within a feature: PascalCase without suffix — `FinanceiroOverview.tsx`, `FluxoDeCaixaTab.tsx`
- Custom hooks: camelCase prefixed with `use` — `useAsaasData.ts`, `useMetaInsightsLive.ts`
- Context files: PascalCase suffixed with `Context` — `AuthContext.tsx`, `NotificationContext.tsx`
- Adapter/transformer modules: camelCase suffixed with `Adapter` — `metaAdapter.ts`, `instagramAdapter.ts`, `asaasAdapter.ts`
- Lib/utility files: camelCase — `metaApi.ts`, `asaas.ts`, `supabase.ts`
- UI primitives (shadcn): lowercase — `button.tsx`, `card.tsx`, `avatar.tsx`

**Functions:**
- Regular functions: camelCase — `formatBRL`, `formatK`, `getLeads`, `aggregateRows`
- React components: PascalCase — `ProtectedRoute`, `AppShell`, `TabErrorBoundary`, `PageSkeleton`
- Hooks: camelCase prefixed with `use` — `useAuth`, `useAsaasData`
- Private/internal helpers: camelCase, defined as inner `function` declarations or `const` — `safeFetch`, `aggregate`, `isoToPeriod`
- Event handlers: camelCase prefixed with `on` or `handle` — `onPickFile`, `handleSignOut`

**Variables:**
- State variables: camelCase nouns — `balance`, `isLoading`, `userMenuOpen`
- Constants / lookup tables: UPPER_SNAKE_CASE — `AUTO_DISMISS_MS`, `PRESET_DAYS`, `INSIGHTS_FIELDS`, `PAYMENT_LABELS`, `METRIC_META`
- Boolean flags: prefixed with `is` or `has` — `isAdmin`, `isLoading`, `hasIntegration`

**TypeScript Types & Interfaces:**
- Interfaces: PascalCase — `AuthProfile`, `AsaasPayment`, `SaleRecord`, `GoalsData`
- Type aliases: PascalCase — `SalesDatePreset`, `PaymentStatus`, `NotificationType`, `SettingsTab`
- Union string literals used as discriminators, e.g. `'client' | 'admin'`, `'success' | 'error'`
- Generic type parameters: single uppercase letter — `T`

## Code Style

**Formatting:**
- No Prettier or Biome config detected; formatting is manual/editor-driven.
- Single quotes for strings in `.ts`/`.tsx` files throughout.
- Semicolons omitted in most `.ts` hook/lib files; present in `.tsx` component files with JSX.
- 2-space indentation throughout.

**Linting:**
- `tsc --noEmit` only (`"lint"` script in `package.json`). No ESLint configured.
- TypeScript target: ES2022, strict-ish — `skipLibCheck: true`, no `strict: true` set explicitly.

## Import Organization

**Order (observed pattern):**
1. React and react-* packages — `import { useState } from 'react'`
2. Third-party libraries — `lucide-react`, `motion/react`, `recharts`
3. UI components via alias — `@/components/ui/card`, `@/components/ui/button`
4. Internal contexts — `../../contexts/AuthContext`
5. Internal hooks — `../../hooks/useAsaasData`
6. Internal adapters/lib — `../../adapters/metaAdapter`, `../../lib/supabase`

**Path Aliases:**
- `@/*` resolves to project root (`./*`) — configured in `tsconfig.json` and `vite.config.ts`.
- UI components imported as `@/components/ui/button` (resolves to `components/ui/button.tsx`).
- Feature-internal imports use relative paths (`../../contexts/`, `../../hooks/`).

## Error Handling

**Patterns:**
- Hooks use a local `error: string | null` state; errors are surfaced to UI via this state.
- Parallel fetches wrapped in a `safeFetch<T>` inner function that catches and accumulates failure labels (see `useAsaasData.ts:38-40`).
- API layers throw `new Error(message)` with a human-readable string extracted from response JSON.
- `AbortController` used in live data hooks to cancel in-flight requests on re-render (`useMetaInsightsLive.ts`).
- `catch { /* ignore */ }` used only where failure is truly inconsequential (e.g., auth context safety timeout).
- Class-based `TabErrorBoundary` used in `FinanceiroPage.tsx` to isolate tab-level render errors.

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- Errors logged with a bracketed module prefix: `console.error('[useAsaasData]', e)`, `console.error('[useSalesData]', e)`
- Warnings for non-critical skips: `console.warn('media insights skipped for ...', e.message)`
- Lib-level errors use descriptive labels: `console.error('IG timeseries error:', e.message)`
- No `console.log` for debug output found in production code.

## Comments

**When to Comment:**
- Section dividers use Unicode box-drawing: `// ─── Section Name ──────────────────────────────────`
- Inline comments explain non-obvious intent: `// Safety valve — never leave the app stuck in loading`
- Auth flow steps labeled inline: `// Skip the INITIAL_SESSION event — handled by getSession() above`
- JSDoc not used anywhere.

## Function Design

**Size:** Functions are generally small and single-purpose; large pages are broken into named inner components (`SidebarContent`, `KpiCard`, `ClientDetailView`).

**Parameters:** Hooks accept a single destructured object for named params — `useMetaInsightsLive({ accountId, level, datePreset, ... })`. Simple utilities use positional args.

**Return Values:**
- Hooks return a flat object with data, loading, error, and a `refresh`/`refetch` function.
- Adapter/transformer functions return typed plain objects or primitives — never promises.
- Context hooks throw if called outside provider: `if (!ctx) throw new Error('useX must be used within XProvider')`.

## Module Design

**Exports:**
- Contexts: named exports for Provider and hook — `export function AuthProvider`, `export function useAuth`.
- Pages: default export — `export default function OverviewPage`.
- Hooks: named export — `export function useAsaasData`.
- Adapters: named exports for each transformer — `export function toOverviewKPIs`, `export function formatBRL`.
- UI primitives: named export of component and variants — `export { Button, buttonVariants }`.

**Barrel Files:**
- Not used. Each file exports directly; consumers import from the specific file path.

## UI Component Conventions

**shadcn/base-ui hybrid:**
- UI primitives in `components/ui/` are built on `@base-ui/react` with `cva` variants and `cn()` for class merging.
- `cn()` helper at `lib/utils.ts` wraps `clsx` + `tailwind-merge`.
- Tailwind v4 used via `@tailwindcss/vite` plugin; utility classes written inline with no custom abstractions.

**Motion/Animation:**
- All animations use `motion/react` (Framer Motion v12 import path).
- Entry animations on layout components follow `{ x: -20, opacity: 0 }` → `{ x: 0, opacity: 1 }` pattern.
- `AnimatePresence` wraps conditional/list renders; `mode="wait"` used for page transitions.

**Lazy Loading:**
- All feature pages loaded with `lazy()` + `<Suspense fallback={<PageSkeleton />}>` in `AppShell.tsx`.

---

*Convention analysis: 2026-04-18*
