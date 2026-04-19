# Testing Patterns

**Analysis Date:** 2026-04-18

## Test Framework

**Runner:** None — no test framework is installed or configured.

**Assertion Library:** None.

**Test Config:** No `jest.config.*`, `vitest.config.*`, or equivalent found in the project root.

**Run Commands:**
```bash
# No test script defined in package.json
npm run lint   # Type-check only: tsc --noEmit
```

## Test File Organization

**Location:** No test files exist anywhere under `src/`. The only `*.test.*` files present are inside `node_modules/@mswjs/interceptors/` (third-party).

**Naming:** Not applicable — no test files.

## Test Structure

**Suite Organization:** Not established.

**Patterns:** Not established.

## Mocking

**Framework:** None installed.

**Patterns:** Not established.

## Fixtures and Factories

**Test Data:** None — no fixtures, factories, or seed files for tests.

**Location:** Not applicable.

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:**
```bash
# Not available — no test runner configured
```

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## What Exists Instead of Tests

The codebase uses several runtime-safety patterns as informal substitutes for test coverage:

**TypeScript type-checking (`tsc --noEmit`):**
- The only automated quality gate. Run via `npm run lint`.
- Catches type errors but not runtime logic or integration behavior.
- `skipLibCheck: true` is set, reducing coverage of third-party type issues.
- No `strict: true`, meaning nullable types, implicit any, and loose checks are allowed.

**Error boundaries:**
- `TabErrorBoundary` (class component) in `src/features/financeiro/FinanceiroPage.tsx:22-45` isolates render errors per tab.

**Runtime guards:**
- `useAuth()` throws if called outside `AuthProvider` — prevents misuse at runtime.
- `useNotifications()` throws similarly.
- Supabase client validates env vars at module init time (`src/lib/supabase.ts:6-8`).
- Auth flow has a 5-second safety timeout to prevent infinite loading states.

**AbortController cleanup:**
- Live data hooks (`useMetaInsightsLive`, `useInstagramInsightsLive`) abort in-flight requests on unmount, preventing state-after-unmount errors.

## Recommendations for Adding Tests

**Highest-value targets (no framework yet — prioritize setup first):**

1. Install Vitest (compatible with Vite, zero config):
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

2. Add to `vite.config.ts`:
```ts
test: { environment: 'jsdom', globals: true }
```

3. Add script to `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Priority test targets:**
- Adapter/transformer functions in `src/adapters/metaAdapter.ts` and `src/adapters/instagramAdapter.ts` — pure functions, trivial to test.
- `aggregate()` helper in `src/hooks/useSalesData.ts:204-216` — pure, business-critical aggregation logic.
- `useAuth` hook behavior — login, session persistence, recovery flow redirects.
- `useSalesData` derived metrics (totalRevenue, byPaymentMethod, byHour).

**Co-location pattern to follow (when adding tests):**
```
src/
  hooks/
    useSalesData.ts
    useSalesData.test.ts    ← place here
  adapters/
    metaAdapter.ts
    metaAdapter.test.ts     ← place here
```

---

*Testing analysis: 2026-04-18*
