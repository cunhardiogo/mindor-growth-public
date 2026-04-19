# Codebase Concerns

**Analysis Date:** 2026-04-18

---

## Tech Debt

**audit_log table referenced but never created:**
- Issue: `api/asaas/[...path].js:64` writes mutation events to `public.audit_log` via REST, but there is no migration that creates this table. Every write silently fails (caught with an empty catch). All Asaas mutations go unlogged.
- Files: `api/asaas/[...path].js`
- Impact: No auditability for financial mutations (payments, subscriptions, customers). Errors swallowed silently.
- Fix approach: Add a migration that creates `public.audit_log (id, user_id, action, details, created_at)` with RLS allowing service-role inserts.

**order_hour column typed but absent from schema:**
- Issue: `SaleRecord.order_hour` is typed as `number | null` in `src/hooks/useSalesData.ts:13`, but the column does not exist in the `sales_data` migration. The hour-of-day chart falls back to extracting hours from `order_date` using local browser time (`getHours()`), which may not match the server/customer timezone.
- Files: `src/hooks/useSalesData.ts:13`, `src/hooks/useSalesData.ts:144`, `supabase/migrations/20260418_sales_ig_cache.sql`
- Impact: Hourly sales chart can show wrong hour buckets for non-BRT clients. Type declaration is dead weight.
- Fix approach: Either add `order_hour int` to the migration (populated during sync), or remove the unused field and document the timezone caveat.

**`client_integrations.config` stores credentials as plaintext JSONB:**
- Issue: The migration comment says "criptografado pelo Supabase", but Supabase does not transparently encrypt JSONB columns. API keys, store tokens, etc., stored in this column are readable by any service-role query.
- Files: `supabase/migrations/20260418_sales_ig_cache.sql:6`
- Impact: Credential leak if the service-role key or database access is compromised.
- Fix approach: Use Supabase Vault (`vault.create_secret`) to store integration credentials, or at minimum encrypt before insert using `pgcrypto`.

**"Ver Relatório" and "Atualizar Dados" buttons are non-functional stubs:**
- Issue: Two prominent buttons in `OverviewPage.tsx` have no `onClick` handlers and do nothing when clicked.
- Files: `src/features/overview/OverviewPage.tsx:176-183`
- Impact: Users click these CTAs expecting behaviour (report export, data refresh) and get nothing. The refresh button beside the revenue card is also non-functional.
- Fix approach: Wire "Atualizar Dados" to `refetch()` from `useMetaInsightsLive` and `useInstagramInsightsLive`. "Ver Relatório" needs a defined scope before implementation.

**"6 meses" period selector silently maps to 90-day window:**
- Issue: `MarketingPage.tsx:65` maps the UI option "6 meses" to `last_90d`. The user selects 6 months but receives 90-day data without any indication of the discrepancy.
- Files: `src/features/marketing/MarketingPage.tsx:65`
- Impact: Misleading metric values for users who explicitly choose 6 months.
- Fix approach: Either remove the "6 meses" option, replace it with a true 180-day preset (checking Meta API support), or display a tooltip warning.

**`toGrowthScore` "Receita" sub-score is a constant:**
- Issue: `src/adapters/metaAdapter.ts:402` calculates `spendScore` as a flat `75` whenever `spend > 0`, regardless of revenue or actual performance. The label displayed to users is "Receita" but the score measures spend activity, not revenue quality.
- Files: `src/adapters/metaAdapter.ts:399-413`
- Impact: Growth score misleads users; a client spending with zero revenue gets 75/100 on "Receita".
- Fix approach: Replace the constant with a real formula (e.g., ROAS-adjusted revenue score) or rename the metric to "Investimento Ativo".

---

## Known Bugs

**`prevFollowers` is always 0 in Instagram KPI delta:**
- Symptoms: "Seguidores Totais" delta always shows "–" (since `prevFollowers = 0` makes `deltaStr` return `'–'`).
- Files: `src/adapters/instagramAdapter.ts:66-71`
- Trigger: Every page load — the variable is hardcoded to 0, never populated from `followersHistoryDelta`.
- Workaround: None.
- Fix approach: Pass `followersHistoryDelta` through the delta calculation when available (it's already provided as a parameter).

**`useInstagramInsightsLive` uses a manual `isCancelledRef` instead of `AbortController`:**
- Symptoms: If the component unmounts while one of the 5 parallel `fetchInstagram*` calls is still in-flight, the fetch itself continues to completion (no abort signal), and the `isCancelledRef` guard only prevents state updates — not the upstream network traffic.
- Files: `src/hooks/useInstagramInsightsLive.ts:25-57`
- Trigger: Fast navigation between pages.
- Workaround: Minor — results are discarded, not shown.
- Fix approach: Replace `isCancelledRef` with `AbortController` signals passed to each `fetchInstagram*` function (already supported by `metaApi.ts::apiGet`).

**`byHour` chart uses `new Date(s.order_date).getHours()` (local browser time):**
- Symptoms: Hour-of-day bars shift by UTC offset for clients outside the browser's local timezone. A 10:00 sale in Brasília is charted at 07:00 for a user in UTC+0 browser.
- Files: `src/hooks/useSalesData.ts:144`
- Trigger: Any user whose browser timezone ≠ BRT, or sales data from ERP systems that store UTC timestamps.
- Fix approach: Store `order_hour` as a DB column in BRT during ERP sync, or convert in the query using `AT TIME ZONE 'America/Sao_Paulo'`.

---

## Security Considerations

**CSP allows `script-src 'unsafe-inline'`:**
- Risk: `unsafe-inline` in the Content-Security-Policy disables protection against reflected/stored XSS attacks in scripts.
- Files: `vercel.json:21`
- Current mitigation: Vite bundles are hashed; no user-controlled script injection detected in current code.
- Recommendations: Use `nonce` or `hash`-based CSP via Vite's `vite-plugin-csp` or Vercel headers. This requires evaluating whether any third-party scripts need inline execution.

**`connect-src` in CSP targets `https://graph.facebook.com` directly:**
- Risk: The frontend `src/lib/metaApi.ts` proxies all Meta API calls through `/api/meta/*`, but the CSP connect-src still includes `https://graph.facebook.com`. If a future developer bypasses the proxy and calls Meta directly, the access token would be exposed in the browser.
- Files: `vercel.json:21`, `src/lib/metaApi.ts`
- Current mitigation: No direct calls to `graph.facebook.com` from the frontend currently.
- Recommendations: Remove `https://graph.facebook.com` from `connect-src` to enforce proxy-only access.

**`service_role insert ig_media_cache` policy uses `with check (true)`:**
- Risk: The RLS insert policy on `instagram_media_insights_cache` and `instagram_followers_history` allows any authenticated request (not just service-role) to insert rows, because the condition is unconditionally `true`.
- Files: `supabase/migrations/20260418_sales_ig_cache.sql:120-131`
- Current mitigation: The tables require `client_id` FK integrity, limiting orphaned inserts.
- Recommendations: Scope the insert policy to `auth.role() = 'service_role'` or restrict to the cron's service key only.

---

## Performance Bottlenecks

**`fetchInstagramMediaBatch` fires N+1 API calls per page load:**
- Problem: `src/lib/metaApi.ts:260` fetches up to 24 posts, then spawns a separate `apiGet` per post for insights — up to 24 sequential-ish fan-out requests. Each goes through the Vercel serverless `/api/meta/ig` cold-start path.
- Files: `src/lib/metaApi.ts:236-306`
- Cause: Instagram Graph API does not support batched per-media insights in a single call; but the 24-post default can be reduced, and results should be cached.
- Improvement path: Lower default `limit` to 12 on live pages; rely on the `instagram_media_insights_cache` Supabase table for the historical posts view. Only hit live API for the cache refresh action.

**`useAsaasData` fetches all payments, subscriptions, and transactions on every admin page view:**
- Problem: `src/hooks/useAsaasData.ts:44-49` fires 5 parallel Asaas API calls (`limit: '100'` each) on mount with no caching. Every navigation to any admin page (Overview, Financeiro, Faturamento) that uses this hook re-fetches.
- Files: `src/hooks/useAsaasData.ts`, `src/features/overview/OverviewPage.tsx:97`, `src/features/financeiro/FinanceiroPage.tsx`
- Cause: No shared state / React Query / SWR; each hook instance is isolated.
- Improvement path: Lift `useAsaasData` to a context or add a simple in-memory cache with a 5-minute TTL.

**`useSalesData` fetches up to 5,000 rows from Supabase into the browser:**
- Problem: `src/hooks/useSalesData.ts:111` applies `.limit(5000)` and pulls all columns including `raw jsonb` (original ERP payload). All aggregations (`byPaymentMethod`, `byState`, `byHour`, `bySeller`, `topProducts`) run in-browser on this large array.
- Files: `src/hooks/useSalesData.ts:104-113`
- Cause: No server-side aggregation; raw data transferred for client-side analytics.
- Improvement path: Move aggregations to Supabase views or RPC functions and return only aggregate rows. Remove `raw` from the `select('*')` (it's never displayed, only stored for debugging).

**`fetchMetaInsightsPaged` paginates up to 20 pages (2,000 rows) per request:**
- Problem: `src/lib/metaApi.ts:57-69` loops up to 20 pages before stopping. At `limit: 200` per page that is 4,000 ad-level rows that then get aggregated in JavaScript.
- Files: `src/lib/metaApi.ts:57-69`
- Cause: Meta API only supports account-level aggregation with limited breakdowns; ad-level pagination is the only way to get campaign data.
- Improvement path: Increase the `limit` param to 500 (Meta max) to reduce round-trips. For the `account` level, use `level=account` to avoid pagination entirely (already done for time-series but not for main insights).

---

## Fragile Areas

**`AuthContext` "remember me" logic uses `localStorage` + `sessionStorage` flags:**
- Files: `src/contexts/AuthContext.tsx:93-98`
- Why fragile: The "no remember me" enforcement calls `supabase.auth.signOut()` on every fresh tab open, even though Supabase's own persistence is set to `localStorage`. Any future change to Supabase session configuration can break this flow silently. The 5-second safety timeout (`safetyTimeout` at line 72) hides auth failures behind a blank loading state.
- Safe modification: Any change to session persistence strategy must re-test: (a) "remember me = false" closes on tab reopen; (b) password recovery redirect; (c) Google OAuth redirect; (d) 5-second timeout scenario.
- Test coverage: None (no test files in project).

**`toEfficiencyData` and `toAcquisitionChannels` detect channel by campaign name substring:**
- Files: `src/adapters/metaAdapter.ts:163-168`, `src/adapters/metaAdapter.ts:360-378`
- Why fragile: Channel detection uses `name.includes('google')` / `name.includes(' ig ')`. If a client names campaigns without these keywords (common in agency-managed accounts), all campaigns collapse into "Meta Ads". Clients may also share spend data across platforms in ways that make this heuristic wrong.
- Safe modification: Treat the output as approximate and add a visible "estimated" caveat to the UI, or add a campaign-source field to the DB schema.

**`verifyAuth` creates a new Supabase admin client on every API call:**
- Files: `api/_lib/auth.js:39-43`
- Why fragile: A new `createClient` instance is instantiated per request. This works on Vercel serverless (stateless by design), but adds unnecessary overhead (connection pool not reused). Also, the function makes 2 sequential DB queries (profiles + clients) — any latency in either delays the entire API response.
- Safe modification: Cache the admin client at module scope (`const adminClient = createClient(...)` outside the function). Combine the two queries with a join.

---

## Scaling Limits

**Single shared `META_ACCESS_TOKEN` for all clients:**
- Current capacity: One long-lived Meta system user token serves all client ad accounts and Instagram accounts.
- Limit: If the token expires or is revoked, the entire platform goes dark for all clients simultaneously. Meta Business tokens expire after 60 days unless refreshed.
- Scaling path: Implement per-client token storage (encrypted in Supabase Vault), with token refresh logic and expiry monitoring via the cron job.

**Vercel Hobby plan cron (UTC 03:00) has no retry logic:**
- Current capacity: `api/cron/ig-snapshot.js` runs once daily. If Meta rate-limits or returns errors for any client, that client's follower snapshot is simply skipped with no retry.
- Files: `api/cron/ig-snapshot.js:49-86`, `vercel.json:2-7`
- Limit: No backfill mechanism; gaps in `instagram_followers_history` accumulate silently.
- Scaling path: Add a retry queue (Supabase table of failed snapshots) and a second cron or a retry on next day's run.

---

## Dependencies at Risk

**`@google/genai` is installed but has zero usage:**
- Risk: The `@google/genai` package (`package.json:17`) is listed as a production dependency but is not imported anywhere in `src/`. It adds ~500KB+ to the bundle analysis surface and a CVE attack surface with no benefit.
- Impact: Bundle size inflation; potential security audit friction.
- Migration plan: Remove from `package.json` until an AI feature is actually implemented.

**`express` and `dotenv` listed as production dependencies:**
- Risk: Neither `express` nor `dotenv` is used in the Vite/React frontend (`src/`) or in the Vercel serverless functions (`api/`). Both are in `dependencies`, not `devDependencies`.
- Impact: Included in production bundle analysis; `express` is a large package.
- Migration plan: Remove both from `dependencies`. If a local Express dev server was once used, it is superseded by `vite --port=3000`.

---

## Missing Critical Features

**No ERP/e-commerce integration sync mechanism in this codebase:**
- Problem: The `client_integrations` and `sales_data` tables are defined in the DB schema, and `useSalesData` reads from `sales_data`, but there is no webhook endpoint, cron job, or sync script to populate this table from Tiny, Nuvemshop, Shopify, etc.
- Blocks: The entire "Faturamento" feature is gated on `hasIntegration` (which checks `sales.length > 0`). Without a sync pipeline, the table is always empty and the page shows empty-state UI for all clients.
- Files: `src/hooks/useSalesData.ts:184`, `src/features/faturamento/FaturamentoPage.tsx:144`

**No token expiry monitoring for Meta access token:**
- Problem: There is no mechanism to detect when `META_ACCESS_TOKEN` is close to expiring (Meta system user tokens expire after 60 days). No alert, no refresh workflow.
- Blocks: Silent, full-platform outage when the token expires.

---

## Test Coverage Gaps

**No test files exist anywhere in the project:**
- What's not tested: All adapters (`metaAdapter.ts`, `instagramAdapter.ts`, `asaasAdapter.ts`), all data transformation logic, auth flows, API proxy handlers.
- Files: `src/adapters/`, `src/hooks/`, `api/`
- Risk: Regressions in metric calculations (ROAS, CAC, CPL, growth score) are invisible. The `toGrowthScore` constant bug and `prevFollowers = 0` bug described above would be caught by unit tests.
- Priority: High for adapters (pure functions, easy to test); Medium for hooks (require MSW mocking).

---

*Concerns audit: 2026-04-18*
