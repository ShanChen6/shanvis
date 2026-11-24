-- =============================================================================
-- SHANVIS catalog schema
--   products            core commerce data (brand, price, stock, category)
--   camera_specs        technical specs as JSONB, with generated columns for
--                       the attributes we filter on (mount, sensor)
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.product_category as enum ('body', 'lens', 'accessory');

create type public.mount_type as enum (
  'sony-e',
  'canon-rf',
  'fujifilm-x',
  'fujifilm-g',
  'nikon-z',
  'l-mount'
);

create type public.sensor_size as enum (
  'full-frame',
  'aps-c',
  'medium-format',
  'micro-four-thirds'
);

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 200),
  brand       text not null check (brand ~ '^[a-z0-9-]+$'),
  category    public.product_category not null,
  price       bigint not null check (price >= 0),          -- VND, integer
  stock       integer not null default 0 check (stock >= 0),
  description text,
  images      text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.products is 'Sellable catalog items: camera bodies, lenses and accessories.';
comment on column public.products.price is 'Price in VND (integer, no decimals).';

create index products_category_idx on public.products (category) where is_active;
create index products_brand_idx on public.products (brand) where is_active;
create index products_price_idx on public.products (price) where is_active;
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- camera_specs
-- ---------------------------------------------------------------------------
create table public.camera_specs (
  product_id  uuid primary key references public.products (id) on delete cascade,
  specs       jsonb not null,

  -- Typed copies of filterable attributes, derived from specs by trigger
  -- (text -> enum casts are not immutable, so generated columns can't be used).
  kind        public.product_category not null,
  mount_type  public.mount_type,
  sensor_size public.sensor_size,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint camera_specs_is_object check (jsonb_typeof(specs) = 'object'),
  constraint camera_specs_kind check (specs ->> 'kind' in ('body', 'lens', 'accessory')),
  constraint camera_specs_body_shape check (
    specs ->> 'kind' <> 'body'
    or (specs ? 'mount_type' and specs ? 'sensor_size' and specs ? 'iso_min' and specs ? 'iso_max')
  ),
  constraint camera_specs_lens_shape check (
    specs ->> 'kind' <> 'lens'
    or (specs ? 'mount_type' and specs ? 'focal_min_mm' and specs ? 'focal_max_mm' and specs ? 'aperture_max')
  )
);

comment on table public.camera_specs is 'Technical specs per product as JSONB (mount, sensor, ISO, IBIS, focal length...).';

create index camera_specs_mount_idx on public.camera_specs (mount_type);
create index camera_specs_sensor_idx on public.camera_specs (sensor_size);
create index camera_specs_specs_gin_idx on public.camera_specs using gin (specs jsonb_path_ops);

create trigger camera_specs_set_updated_at
  before update on public.camera_specs
  for each row execute function public.set_updated_at();

-- Derive typed columns from specs and check the kind matches the product category.
create or replace function public.sync_camera_specs()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  product_category public.product_category;
begin
  new.kind        := (new.specs ->> 'kind')::public.product_category;
  new.mount_type  := (new.specs ->> 'mount_type')::public.mount_type;
  new.sensor_size := coalesce(new.specs ->> 'sensor_size', new.specs ->> 'sensor_coverage')::public.sensor_size;

  select p.category into product_category from public.products p where p.id = new.product_id;
  if product_category is distinct from new.kind then
    raise exception 'specs.kind (%) does not match product category (%)', new.kind, product_category
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger camera_specs_sync
  before insert or update on public.camera_specs
  for each row execute function public.sync_camera_specs();

-- ---------------------------------------------------------------------------
-- Row Level Security: the storefront reads, only the service role writes.
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.camera_specs enable row level security;

create policy "Active products are readable by everyone"
  on public.products for select
  to anon, authenticated
  using (is_active);

create policy "Specs of active products are readable by everyone"
  on public.camera_specs for select
  to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

-- ---------------------------------------------------------------------------
-- Convenience view for the storefront (respects RLS of the caller).
-- ---------------------------------------------------------------------------
create view public.products_with_specs
with (security_invoker = true)
as
select
  p.*,
  s.specs,
  s.mount_type,
  s.sensor_size
from public.products p
left join public.camera_specs s on s.product_id = p.id;
