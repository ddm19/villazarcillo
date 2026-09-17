-- =========================================================
-- Villazarcillo — esquema de contenido editable desde /admin
-- Ejecutar una vez en el SQL Editor de Supabase.
-- =========================================================

create table if not exists villazarcillo_config (
  id smallint primary key default 1,
  title text not null,
  default_scene_id text not null,
  assets_base_url text not null default '',
  feature_flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint villazarcillo_config_singleton check (id = 1)
);

create table if not exists villazarcillo_scenes (
  id text primary key,
  name text not null,
  background text not null,
  background_video text,
  width integer not null,
  height integer not null,
  center_x integer not null,
  center_y integer not null,
  zoom integer not null default 0,
  min_zoom integer,
  max_zoom integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists villazarcillo_scene_layers (
  scene_id text not null references villazarcillo_scenes(id) on delete cascade,
  id text not null,
  name text not null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  primary key (scene_id, id)
);

create table if not exists villazarcillo_panels (
  id text primary key,
  type text not null check (type in ('markdown', 'table', 'image')),
  title text,
  portrait text,
  subtitle text,
  content jsonb,           -- MarkdownBlock[] (type = markdown)
  columns jsonb,           -- string[] (type = table)
  rows jsonb,              -- TableCell[][] (type = table)
  image text,              -- (type = image)
  cta jsonb,               -- { label, href, quest }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists villazarcillo_resources (
  id text primary key,
  type text not null check (type in ('markdown', 'table', 'image')),
  title text,
  portrait text,
  subtitle text,
  content jsonb,
  columns jsonb,
  rows jsonb,
  image text,
  cta jsonb,
  icon text,
  amount text,
  pinned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists villazarcillo_elements (
  id text primary key,
  scene_id text not null references villazarcillo_scenes(id) on delete cascade,
  layer_id text not null,
  type text not null check (type in ('npc','shop','quest','image','note','generic')),
  name text not null,
  position_x integer not null,
  position_y integer not null,
  icon jsonb,              -- { kind:'pin', colorVar }
  sprite jsonb,            -- { src, width, height, rotation }
  panel_id text references villazarcillo_panels(id) on delete set null,
  badge_label text,
  nav_scene_id text references villazarcillo_scenes(id),
  nav_focus_id text,
  nav_layers jsonb,        -- string[] | null (null = "sin capas")
  completed boolean not null default false,
  is_dangerous boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (scene_id, layer_id) references villazarcillo_scene_layers(scene_id, id)
);

create index if not exists idx_villazarcillo_elements_scene on villazarcillo_elements(scene_id);
create index if not exists idx_villazarcillo_elements_panel on villazarcillo_elements(panel_id);

-- ---------------------------------------------------------
-- RLS: lectura pública, escritura solo admin
-- ---------------------------------------------------------
alter table villazarcillo_config enable row level security;
alter table villazarcillo_scenes enable row level security;
alter table villazarcillo_scene_layers enable row level security;
alter table villazarcillo_panels enable row level security;
alter table villazarcillo_resources enable row level security;
alter table villazarcillo_elements enable row level security;

create or replace function villazarcillo_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'villazarcillo_config',
    'villazarcillo_scenes',
    'villazarcillo_scene_layers',
    'villazarcillo_panels',
    'villazarcillo_resources',
    'villazarcillo_elements'
  ] loop
    execute format('drop policy if exists "%1$s_public_read" on %1$s;', t);
    execute format('drop policy if exists "%1$s_admin_write" on %1$s;', t);
    execute format('drop policy if exists "%1$s_admin_update" on %1$s;', t);
    execute format('drop policy if exists "%1$s_admin_delete" on %1$s;', t);
    execute format('create policy "%1$s_public_read" on %1$s for select using (true);', t);
    execute format('create policy "%1$s_admin_write" on %1$s for insert with check (villazarcillo_is_admin());', t);
    execute format('create policy "%1$s_admin_update" on %1$s for update using (villazarcillo_is_admin()) with check (villazarcillo_is_admin());', t);
    execute format('create policy "%1$s_admin_delete" on %1$s for delete using (villazarcillo_is_admin());', t);
  end loop;
end $$;

-- ---------------------------------------------------------
-- Storage: bucket público para assets, escritura solo admin
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('villazarcillo-assets', 'villazarcillo-assets', true)
on conflict (id) do nothing;

drop policy if exists "villazarcillo_assets_public_read" on storage.objects;
drop policy if exists "villazarcillo_assets_admin_write" on storage.objects;
drop policy if exists "villazarcillo_assets_admin_update" on storage.objects;
drop policy if exists "villazarcillo_assets_admin_delete" on storage.objects;

create policy "villazarcillo_assets_public_read"
on storage.objects for select
using (bucket_id = 'villazarcillo-assets');

create policy "villazarcillo_assets_admin_write"
on storage.objects for insert
with check (bucket_id = 'villazarcillo-assets' and villazarcillo_is_admin());

create policy "villazarcillo_assets_admin_update"
on storage.objects for update
using (bucket_id = 'villazarcillo-assets' and villazarcillo_is_admin());

create policy "villazarcillo_assets_admin_delete"
on storage.objects for delete
using (bucket_id = 'villazarcillo-assets' and villazarcillo_is_admin());
