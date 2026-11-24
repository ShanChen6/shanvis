-- =============================================================================
-- sample_photos: sample gallery shown on the product page, each with EXIF.
-- =============================================================================

create table public.sample_photos (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  image_url   text not null,
  alt         text not null,
  exif        jsonb not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  constraint sample_photos_exif_shape check (
    jsonb_typeof(exif) = 'object'
    and exif ? 'camera' and exif ? 'lens' and exif ? 'focal_length_mm'
    and exif ? 'aperture' and exif ? 'shutter' and exif ? 'iso'
  )
);

comment on table public.sample_photos is 'Sample gallery photos per product, with EXIF (camera, lens, focal length, aperture, shutter, ISO).';

create index sample_photos_product_idx on public.sample_photos (product_id, sort_order);

alter table public.sample_photos enable row level security;

create policy "Sample photos of active products are readable by everyone"
  on public.sample_photos for select
  to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
