-- Adds username and avatar_url to profiles for the new Configurações page.
-- avatar_url stores either an external URL or a public URL from the
-- "avatars" Storage bucket created below.
--
-- Run order (in Supabase SQL editor):
--   1) Run this whole file once.
--   2) The avatars bucket policies assume Storage is enabled. If the
--      "avatars" bucket already exists, the INSERT...ON CONFLICT is a no-op.

-- ── Columns ─────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists username   text,
  add column if not exists avatar_url text;

-- One username per user (NULLs allowed and don't conflict)
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

-- ── Storage bucket for avatars ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read of any avatar
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- A user can upload/update/delete files inside their own folder: <user_id>/...
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Profile self-update policy ──────────────────────────────────────────────
-- Ensure the user can update their own row. (Idempotent: drop+create.)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
