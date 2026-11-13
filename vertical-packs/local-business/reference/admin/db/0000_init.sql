-- The restaurant's own database. Created for each site by the deploy script, which runs scripts/migrate.mjs.
create table if not exists menu_categories (
  id serial primary key,
  position int not null default 0,
  name text not null
);
create table if not exists menu_items (
  id serial primary key,
  category_id int not null references menu_categories(id) on delete cascade,
  position int not null default 0,
  name text not null,
  price text,
  description text,
  hidden boolean not null default false
);
create index if not exists menu_items_category_idx on menu_items (category_id, position);

-- A request is not a booking: the owner confirms by phone or email.
create table if not exists table_requests (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  phone text,
  email text,
  day text not null,
  time text not null,
  party_size int not null,
  note text,
  status text not null default 'new',
  emailed boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists table_requests_created_idx on table_requests (created_at desc);

-- Small facts about the site. menu_managed = true once the menu was copied from the brief into the tables above.
create table if not exists site_meta (
  key text primary key,
  value text not null
);

-- Failed sign-ins, to slow down guessing. A one-way hash of the address, never the address.
create table if not exists admin_login_failures (
  id serial primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index if not exists admin_login_failures_idx on admin_login_failures (ip_hash, at);
