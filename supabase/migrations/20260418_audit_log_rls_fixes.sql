-- audit_log: registra mutações financeiras do Asaas (criado por api/asaas/[...path].js)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.audit_log enable row level security;

-- Apenas admins podem ler o audit log
drop policy if exists "Admin read audit_log" on public.audit_log;
create policy "Admin read audit_log" on public.audit_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Apenas service role pode inserir (cron e serverless functions)
drop policy if exists "Service role insert audit_log" on public.audit_log;
create policy "Service role insert audit_log" on public.audit_log
  for insert with check (auth.role() = 'service_role');

create index if not exists audit_log_user_date on public.audit_log (user_id, created_at desc);
create index if not exists audit_log_action on public.audit_log (action, created_at desc);

-- Fix RLS: insert policies nas tabelas IG devem ser restritas ao service_role
-- instagram_followers_history
drop policy if exists "Service role insert ig_followers_history" on public.instagram_followers_history;
create policy "Service role insert ig_followers_history" on public.instagram_followers_history
  for insert with check (auth.role() = 'service_role');

-- instagram_media_insights_cache
drop policy if exists "Service role insert ig_media_cache" on public.instagram_media_insights_cache;
create policy "Service role insert ig_media_cache" on public.instagram_media_insights_cache
  for insert with check (auth.role() = 'service_role');

drop policy if exists "Service role update ig_media_cache" on public.instagram_media_insights_cache;
create policy "Service role update ig_media_cache" on public.instagram_media_insights_cache
  for update using (auth.role() = 'service_role');
