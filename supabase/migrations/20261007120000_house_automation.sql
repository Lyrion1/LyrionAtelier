-- Lyrīon house automation: order fulfilment ledger, reading and certificate
-- deliveries, the Birthday Book, partner and contact enquiries, and the
-- heartbeat that keeps the project awake.
--
-- Row-level security is on for every table and no policy is granted, so the
-- public anon key can read or write nothing. Only the Edge Functions, which
-- use the service role, touch these tables.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  payment_intent text,
  customer_email text,
  gift_note text,
  printful_status text not null default 'none'
    check (printful_status in ('none', 'pending', 'created', 'failed')),
  printful_order_id bigint,
  printful_attempts integer not null default 0,
  printful_last_error text,
  printful_payload jsonb,
  owner_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  stripe_session_id text not null,
  line integer not null,
  product_slug text not null,
  product_title text not null,
  product_type text not null check (product_type in ('reading', 'certificate')),
  details jsonb not null,
  customer_email text not null,
  recipient_email text,
  gift_note text,
  draft text,
  status text not null default 'awaiting_generation'
    check (status in ('awaiting_generation', 'awaiting_approval', 'delivered', 'failed')),
  attempts integer not null default 0,
  last_error text,
  due_at timestamptz not null default (now() + interval '48 hours'),
  owner_notified_at timestamptz,
  reminded_at timestamptz,
  approved_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (stripe_session_id, line)
);
create index if not exists deliveries_status_idx on public.deliveries (status, due_at);

create table if not exists public.birthday_book (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  owner_name text,
  person_name text not null,
  birth_month smallint not null check (birth_month between 1 and 12),
  birth_day smallint not null check (birth_day between 1 and 31),
  birth_year smallint check (birth_year between 1900 and 2100),
  relationship text,
  consent_text text not null,
  consent_at timestamptz not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_email, person_name, birth_month, birth_day)
);
create index if not exists birthday_book_due_idx on public.birthday_book (birth_month, birth_day)
  where confirmed_at is not null and unsubscribed_at is null;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('partner', 'contact')),
  lane text,
  name text not null,
  email text not null,
  organisation text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.heartbeat (
  id smallint primary key default 1 check (id = 1),
  beat_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.deliveries enable row level security;
alter table public.birthday_book enable row level security;
alter table public.enquiries enable row level security;
alter table public.heartbeat enable row level security;
