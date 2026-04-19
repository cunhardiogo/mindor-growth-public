-- Tabela de configuração de integrações por cliente (ERP, e-commerce, etc)
create table if not exists public.client_integrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  integration_type text not null, -- 'tiny', 'nuvemshop', 'shopify', 'bling', 'woocommerce', etc
  config jsonb default '{}', -- api_key, store_id, etc (criptografado pelo Supabase)
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: apenas admin vê/edita integrações
alter table public.client_integrations enable row level security;
drop policy if exists "Admin only - client_integrations" on public.client_integrations;
create policy "Admin only - client_integrations" on public.client_integrations
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Tabela genérica de dados de vendas (normalizada, source-agnostic)
create table if not exists public.sales_data (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  integration_type text not null,
  order_id text not null,
  order_date timestamptz not null,
  state_code text, -- UF (SP, RJ, etc)
  city text,
  total_value numeric(12,2) not null default 0,
  payment_method text, -- 'pix', 'credit_card', 'boleto', 'debit_card', etc
  seller_id text,
  seller_name text,
  status text, -- 'paid', 'pending', 'cancelled', etc
  items jsonb default '[]', -- [{product_id, product_name, qty, unit_price}]
  raw jsonb default '{}', -- payload original
  synced_at timestamptz default now(),
  unique(client_id, integration_type, order_id)
);

alter table public.sales_data enable row level security;
drop policy if exists "Users see own client sales" on public.sales_data;
create policy "Users see own client sales" on public.sales_data
  using (
    client_id in (
      select client_id from public.profiles where id = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create index if not exists sales_data_client_date on public.sales_data (client_id, order_date desc);
create index if not exists sales_data_client_state on public.sales_data (client_id, state_code);
create index if not exists sales_data_client_seller on public.sales_data (client_id, seller_id);
create index if not exists sales_data_client_payment on public.sales_data (client_id, payment_method);
create index if not exists sales_data_client_hour on public.sales_data (client_id, (extract(hour from order_date at time zone 'America/Sao_Paulo')::int));

-- Snapshot diário de seguidores IG
create table if not exists public.instagram_followers_history (
  id uuid primary key default gen_random_uuid(),
  ig_user_id text not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  snapshot_date date not null default current_date,
  followers_count bigint not null default 0,
  follows_count bigint not null default 0,
  created_at timestamptz default now(),
  unique(ig_user_id, snapshot_date)
);

alter table public.instagram_followers_history enable row level security;
drop policy if exists "Users see own IG history" on public.instagram_followers_history;
create policy "Users see own IG history" on public.instagram_followers_history
  using (
    client_id in (
      select client_id from public.profiles where id = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create index if not exists ig_followers_history_user_date on public.instagram_followers_history (ig_user_id, snapshot_date desc);

-- Cache de insights por post IG
create table if not exists public.instagram_media_insights_cache (
  id uuid primary key default gen_random_uuid(),
  media_id text not null unique,
  ig_user_id text not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  media_type text, -- VIDEO, IMAGE, CAROUSEL_ALBUM
  media_product_type text, -- REELS, FEED, etc
  thumbnail_url text,
  permalink text,
  timestamp timestamptz,
  like_count int default 0,
  comments_count int default 0,
  saved int default 0,
  shares int default 0,
  reach int default 0,
  views int default 0,
  plays int default 0,
  fetched_at timestamptz default now()
);

alter table public.instagram_media_insights_cache enable row level security;
drop policy if exists "Users see own IG media cache" on public.instagram_media_insights_cache;
create policy "Users see own IG media cache" on public.instagram_media_insights_cache
  using (
    client_id in (
      select client_id from public.profiles where id = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create index if not exists ig_media_cache_user on public.instagram_media_insights_cache (ig_user_id, timestamp desc);
create index if not exists ig_media_cache_type on public.instagram_media_insights_cache (ig_user_id, media_type);

-- Snapshot RLS insert policy para service role (cron)
drop policy if exists "Service role insert ig_followers_history" on public.instagram_followers_history;
create policy "Service role insert ig_followers_history" on public.instagram_followers_history
  for insert with check (true);

drop policy if exists "Service role insert ig_media_cache" on public.instagram_media_insights_cache;
create policy "Service role insert ig_media_cache" on public.instagram_media_insights_cache
  for insert with check (true);

drop policy if exists "Service role update ig_media_cache" on public.instagram_media_insights_cache;
create policy "Service role update ig_media_cache" on public.instagram_media_insights_cache
  for update using (true);
