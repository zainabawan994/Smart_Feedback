-- SmartFeedback schema. Paste into Supabase → SQL editor and run once.

-- Owner accounts (the app hashes passwords with scrypt; it never stores plain passwords).
create table if not exists users (
  id            uuid primary key,
  email         text not null unique check (email = lower(email)),
  password_hash text not null,
  email_verified  boolean not null default false,
  session_version integer not null default 1, -- bumped on password change: old login cookies stop working
  created_at    timestamptz not null default now()
);

-- One active 6-digit code per email and purpose. Only an HMAC of the code is stored.
create table if not exists codes (
  email      text not null,
  purpose    text not null check (purpose in ('verify','reset')),
  hash       text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  sent_at    timestamptz not null default now(),
  primary key (email, purpose)
);

create table if not exists businesses (
  slug              text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name              text not null,
  city              text not null default '',
  kind              text not null default 'café',
  google_review_url text not null default '',
  menu              text[] not null default '{}',
  highlights        jsonb not null default '{"positive":[],"neutral":[],"negative":[]}',
  default_lang      text not null default 'en' check (default_lang in ('en','ur','roman')),
  owner_id          uuid references users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table if not exists events (
  id         bigint generated always as identity primary key,
  slug       text not null references businesses(slug) on delete cascade,
  type       text not null check (type in ('visit','generate','copy','google','tap')), -- tap = ESP32 station button
  sentiment  text check (sentiment in ('positive','neutral','negative')),
  tags       text[], -- generate events: dish / occasion / photo / note / lang:xx
  created_at timestamptz not null default now()
);
create index if not exists events_slug_time on events (slug, created_at desc);

-- The app talks to Supabase from the server with the service-role key, so lock the tables
-- to everyone else (no anon/public access at all; the server checks ownership itself).
alter table users enable row level security;
alter table codes enable row level security;
alter table businesses enable row level security;
alter table events enable row level security;

-- Drafts customers generated (their choices + draft text only; no photos or contact details).
create table if not exists drafts (
  id         uuid primary key,
  slug       text not null references businesses(slug) on delete cascade,
  sentiment  text not null check (sentiment in ('positive','neutral','negative')),
  lang       text not null check (lang in ('en','ur','roman')),
  picks      text[] not null default '{}',
  items      text[] not null default '{}',
  occasions  text[] not null default '{}',
  has_photo  boolean not null default false,
  has_note   boolean not null default false,
  text       text not null,
  source     text not null check (source in ('llm','template')),
  created_at timestamptz not null default now()
);
create index if not exists drafts_slug_time on drafts (slug, created_at desc);
alter table drafts enable row level security;

insert into businesses (slug, name, city, kind, google_review_url, menu, highlights) values (
  'chai-khana', 'Chai Khana', 'Lahore', 'café',
  'https://search.google.com/local/writereview?placeid=REPLACE_WITH_PLACE_ID',
  array['Doodh patti','Kashmiri chai','Bun kebab','Aloo paratha','Zinger roll','Gulab jamun'],
  '{"positive":["Chai was strong and fresh","Food came out hot","Staff were friendly","Quick service","Cozy seating","Good value for money","Clean place","Nice music"],
    "neutral":["Food was fine","Service was okay","A bit crowded","Average prices","Took a while to order","Seating was alright"],
    "negative":["Food arrived cold","Long wait","Staff seemed rushed","Too pricey for the portion","Table wasn''t clean","Order was wrong","Too noisy"]}'
) on conflict (slug) do nothing;

-- Upgrading an older database:
alter table events add column if not exists tags text[];
alter table users add column if not exists email_verified boolean not null default false;
alter table users add column if not exists session_version integer not null default 1;

-- Saved AI analysis of each business's feedback history (one row per business, replaced on re-analyze).
create table if not exists insights (
  slug text primary key references businesses(slug) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table insights enable row level security;

-- Wrong-password counter per email (5 tries, then locked for 15 minutes). Shared by every server.
create table if not exists login_attempts (
  email text primary key,
  n     integer not null,
  until timestamptz not null
);
alter table login_attempts enable row level security;

-- New Supabase projects don't auto-grant API roles: give only the server's service-role key access.
grant select, insert, update, delete on users, codes, businesses, events, drafts, insights, login_attempts to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ESP32 feedback station: allow 'tap' events on databases made before it existed.
alter table events drop constraint if exists events_type_check;
alter table events add constraint events_type_check check (type in ('visit','generate','copy','google','tap'));

-- Owner overview numbers, counted in Postgres so the app never downloads raw events. Days are UTC.
create or replace function business_stats(p_slug text) returns jsonb language sql stable as $$
  with e as (select type, sentiment, tags, created_at from events where slug = p_slug),
  days as (select d::date as day from generate_series((now() at time zone 'utc')::date - 13, (now() at time zone 'utc')::date, interval '1 day') d)
  select jsonb_build_object(
    'counts', (select jsonb_build_object(
        'visit', count(*) filter (where type = 'visit'), 'generate', count(*) filter (where type = 'generate'),
        'copy', count(*) filter (where type = 'copy'), 'google', count(*) filter (where type = 'google'),
        'tap', count(*) filter (where type = 'tap')) from e),
    'sentiment', (select jsonb_build_object(
        'positive', count(*) filter (where sentiment = 'positive'), 'neutral', count(*) filter (where sentiment = 'neutral'),
        'negative', count(*) filter (where sentiment = 'negative')) from e where type = 'generate'),
    'station', (select jsonb_build_object(
        'positive', count(*) filter (where sentiment = 'positive'), 'neutral', count(*) filter (where sentiment = 'neutral'),
        'negative', count(*) filter (where sentiment = 'negative')) from e where type = 'tap'),
    'daily', (select jsonb_agg(jsonb_build_object('day', to_char(days.day, 'YYYY-MM-DD'),
        'visits', (select count(*) from e where type = 'visit' and (created_at at time zone 'utc')::date = days.day),
        'google', (select count(*) from e where type = 'google' and (created_at at time zone 'utc')::date = days.day)) order by days.day) from days),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('type', type, 'at', created_at, 'sentiment', sentiment, 'tags', tags) order by created_at desc), '[]')
        from (select * from e order by created_at desc limit 30) r),
    'signals', (select coalesce(jsonb_object_agg(t, n), '{}') from (select t, count(*) as n from e, unnest(tags) as t where type = 'generate' group by t) s)
  )
$$;
-- Only the server key may call it (RLS already hides rows from everyone else).
revoke execute on function business_stats(text) from public, anon, authenticated;
grant execute on function business_stats(text) to service_role;
