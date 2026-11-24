-- =============================================================================
-- create_product: insert a product and its specs atomically (admin form).
-- p: { slug, name, brand, category, price, stock, description?, images?, specs }
-- =============================================================================
create or replace function public.create_product(p jsonb)
returns public.products
language plpgsql
set search_path = ''
as $$
declare
  prod public.products;
begin
  insert into public.products (slug, name, brand, category, price, stock, description, images)
  values (
    p ->> 'slug', p ->> 'name', p ->> 'brand', (p ->> 'category')::public.product_category,
    (p ->> 'price')::bigint, (p ->> 'stock')::integer, nullif(p ->> 'description', ''),
    coalesce(array(select jsonb_array_elements_text(p -> 'images')), '{}')
  )
  returning * into prod;

  insert into public.camera_specs (product_id, specs) values (prod.id, p -> 'specs');
  return prod;
end;
$$;

revoke execute on function public.create_product(jsonb) from public, anon, authenticated;
grant execute on function public.create_product(jsonb) to service_role;
