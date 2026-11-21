-- SmartFeedback schema. Paste into Supabase → SQL editor and run once.

create table if not exists businesses (
  slug              text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name              text not null,
  city              text not null default '',
  kind              text not null default 'café',
  google_review_url text not null default '',
  menu              text[] not null default '{}',
  highlights        jsonb not null default '{"positive":[],"neutral":[],"negative":[]}',
  default_lang      text not null default 'en' check (default_lang in ('en','ur')),
  owner_id          uuid references auth.users(id), -- for Supabase Auth once the owner desk gets login
  created_at        timestamptz not null default now()
);

create table if not exists events (
  id         bigint generated always as identity primary key,
  slug       text not null references businesses(slug) on delete cascade,
  type       text not null check (type in ('visit','generate','copy','google')),
  sentiment  text check (sentiment in ('positive','neutral','negative')),
  created_at timestamptz not null default now()
);
create index if not exists events_slug_time on events (slug, created_at desc);

-- The app talks to Supabase from the server with the service-role key, so lock the tables
-- to everyone else. Owners will get row access via owner_id policies when auth is added.
alter table businesses enable row level security;
alter table events enable row level security;

insert into businesses (slug, name, city, kind, google_review_url, menu, highlights) values (
  'chai-khana', 'Chai Khana', 'Lahore', 'café',
  'https://search.google.com/local/writereview?placeid=REPLACE_WITH_PLACE_ID',
  array['Doodh patti','Kashmiri chai','Bun kebab','Aloo paratha','Zinger roll','Gulab jamun'],
  '{"positive":["Chai was strong and fresh","Food came out hot","Staff were friendly","Quick service","Cozy seating","Good value for money","Clean place","Nice music"],
    "neutral":["Food was fine","Service was okay","A bit crowded","Average prices","Took a while to order","Seating was alright"],
    "negative":["Food arrived cold","Long wait","Staff seemed rushed","Too pricey for the portion","Table wasn''t clean","Order was wrong","Too noisy"]}'
) on conflict (slug) do nothing;
