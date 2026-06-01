-- 0003_messaging.sql
-- Support columns for real SMS/email messaging.

-- Track opt-outs ourselves (Twilio also blocks them, but we keep our own record
-- so the UI can hide opted-out contacts and we have an audit trail for TCPA).
alter table prospects add column if not exists opted_out boolean not null default false;
alter table leads     add column if not exists opted_out boolean not null default false;

-- Provider message id + delivery status on each message row.
alter table messages add column if not exists provider_sid text;
alter table messages add column if not exists status text default 'queued'; -- queued|sent|delivered|failed|received
alter table messages add column if not exists channel text default 'sms';    -- sms|email

-- A company-wide opt-out list keyed by phone/email, so a STOP on one campaign
-- suppresses that contact everywhere.
create table if not exists suppressions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  channel     text not null,          -- 'sms' | 'email'
  address     text not null,          -- phone (E.164) or email
  reason      text not null default 'opt_out',
  created_at  timestamptz not null default now(),
  unique (company_id, channel, address)
);
alter table suppressions enable row level security;
create policy su_rw on suppressions for all
  using (company_id in (select current_company_ids()))
  with check (company_id in (select current_company_ids()));
