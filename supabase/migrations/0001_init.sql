-- GlassHouse schema — initial migration
-- Run with: supabase db push   (or paste into the SQL editor in the dashboard)
--
-- Design notes:
--  * Every business is a "company". Users belong to one company.
--  * Row-Level Security (RLS) makes sure a company only ever sees its own rows.
--  * The prototype's in-memory shapes map almost 1:1 to these tables.

-- ---------- companies & membership ----------
create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Links an auth user (Supabase auth.users) to a company.
create table if not exists memberships (
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  role        text not null default 'member',   -- 'owner' | 'admin' | 'member'
  created_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);

-- helper: the company_ids the current user belongs to
create or replace function current_company_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select company_id from memberships where user_id = auth.uid()
$$;

-- ---------- prospect groups & prospects ----------
create table if not exists prospect_groups (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  source      text not null default 'Reveal',   -- 'Reveal' | 'ReEngage' | 'Import'
  geometry    jsonb,                             -- the drawn polygon/bounds
  status      text not null default 'ready',     -- 'ready' | 'sent'
  created_at  timestamptz not null default now()
);

create table if not exists prospects (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references prospect_groups(id) on delete cascade,
  company_id    uuid not null references companies(id) on delete cascade,
  name          text,
  address       text,
  phone         text,
  email         text,
  home_value    integer,
  equity        integer,
  beds          integer,
  sqft          integer,
  year_built    integer,
  lat           double precision,
  lng           double precision,
  dnc           boolean not null default false,  -- do-not-call flag from data provider
  created_at    timestamptz not null default now()
);

-- ---------- campaigns & messages ----------
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  group_id    uuid references prospect_groups(id) on delete set null,
  channel     text not null,                     -- 'sms' | 'email'
  template    text,
  body        text not null,
  subject     text,
  sent_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- One row per lead on the Sales Board (a prospect who replied / is in pipeline)
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  prospect_id   uuid references prospects(id) on delete set null,
  campaign_id   uuid references campaigns(id) on delete set null,
  name          text,
  address       text,
  phone         text,
  lat           double precision,
  lng           double precision,
  stage         text not null default 'needsAttention', -- 'jackie' | 'needsAttention' | 'booked'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  lead_id     uuid not null references leads(id) on delete cascade,
  direction   text not null,                     -- 'out' | 'in'
  sender      text not null default 'us',        -- 'us' | 'lead' | 'ai'
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_prospects_group on prospects(group_id);
create index if not exists idx_leads_company on leads(company_id);
create index if not exists idx_messages_lead on messages(lead_id);

-- ---------- Row-Level Security ----------
alter table companies        enable row level security;
alter table memberships      enable row level security;
alter table prospect_groups  enable row level security;
alter table prospects        enable row level security;
alter table campaigns        enable row level security;
alter table leads            enable row level security;
alter table messages         enable row level security;

-- companies: visible if you're a member
create policy company_read on companies for select
  using (id in (select current_company_ids()));

-- memberships: you can see your own
create policy membership_self on memberships for select
  using (user_id = auth.uid());

-- generic company-scoped policy applied to the data tables
create policy pg_rw  on prospect_groups for all
  using (company_id in (select current_company_ids()))
  with check (company_id in (select current_company_ids()));
create policy pr_rw  on prospects for all
  using (company_id in (select current_company_ids()))
  with check (company_id in (select current_company_ids()));
create policy ca_rw  on campaigns for all
  using (company_id in (select current_company_ids()))
  with check (company_id in (select current_company_ids()));
create policy le_rw  on leads for all
  using (company_id in (select current_company_ids()))
  with check (company_id in (select current_company_ids()));
create policy me_rw  on messages for all
  using (company_id in (select current_company_ids()))
  with check (company_id in (select current_company_ids()));
