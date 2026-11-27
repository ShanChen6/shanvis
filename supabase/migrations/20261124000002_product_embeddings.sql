-- =============================================================================
-- Semantic search with pgvector
--   product_embeddings  one embedding per product, built from name + specs +
--                       description. 768 dims = Gemini embedding output with
--                       outputDimensionality: 768 (fits an HNSW index).
-- =============================================================================

create extension if not exists vector with schema extensions;

create table public.product_embeddings (
  product_id  uuid primary key references public.products (id) on delete cascade,
  content     text not null,
  embedding   extensions.vector(768) not null,
  model       text not null,
  updated_at  timestamptz not null default now()
);

comment on table public.product_embeddings is 'Vector embeddings of products for AI / semantic search (AI Rig Builder).';
comment on column public.product_embeddings.content is 'The exact text that was embedded, kept for re-indexing and debugging.';

create index product_embeddings_hnsw_idx
  on public.product_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create trigger product_embeddings_set_updated_at
  before update on public.product_embeddings
  for each row execute function public.set_updated_at();

alter table public.product_embeddings enable row level security;
-- No policies: only the service role (server side) can read or write embeddings.

-- ---------------------------------------------------------------------------
-- match_products: nearest active, in-stock products to a query embedding,
-- optionally filtered by category, mount and max price.
-- ---------------------------------------------------------------------------
create or replace function public.match_products(
  query_embedding   extensions.vector(768),
  match_count       integer default 10,
  filter_category   public.product_category default null,
  filter_mount      public.mount_type default null,
  max_price         bigint default null
)
returns table (
  product_id  uuid,
  slug        text,
  name        text,
  brand       text,
  category    public.product_category,
  price       bigint,
  stock       integer,
  specs       jsonb,
  similarity  double precision
)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    p.slug,
    p.name,
    p.brand,
    p.category,
    p.price,
    p.stock,
    s.specs,
    1 - (e.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.product_embeddings e
  join public.products p on p.id = e.product_id
  left join public.camera_specs s on s.product_id = p.id
  where p.is_active
    and p.stock > 0
    and (filter_category is null or p.category = filter_category)
    and (filter_mount is null or s.mount_type = filter_mount)
    and (max_price is null or p.price <= max_price)
  order by e.embedding operator(extensions.<=>) query_embedding
  limit least(match_count, 50);
$$;

revoke execute on function public.match_products from public, anon, authenticated;
grant execute on function public.match_products to service_role;
