-- =============================================================================
-- Orders & payments
--   orders       one row per checkout; public_id is the unguessable id used in
--                URLs, order_code is the numeric code sent to PayOS
--   order_items  price snapshot per line
-- Stock is reserved when the order is placed and released if it is cancelled
-- or the payment window expires. All writes go through the functions below,
-- called with the service role; RLS blocks direct access for anon users.
-- =============================================================================

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'shipped',
  'completed',
  'cancelled',
  'expired'
);

create sequence public.order_code_seq start 100001;

create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  public_id           text not null unique default replace(gen_random_uuid()::text, '-', ''),
  order_code          bigint not null unique default nextval('public.order_code_seq'),
  status              public.order_status not null default 'pending_payment',

  customer_name       text not null check (char_length(customer_name) between 2 and 100),
  customer_phone      text not null check (customer_phone ~ '^0[0-9]{9}$'),
  customer_email      text check (customer_email is null or customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address_line        text not null check (char_length(address_line) between 3 and 200),
  province_name       text not null,
  district_name       text not null,
  ward_name           text not null,
  -- GHN master-data ids, when the address was picked from GHN lists
  ghn_district_id     integer,
  ghn_ward_code       text,
  note                text check (note is null or char_length(note) <= 500),

  subtotal            bigint not null check (subtotal >= 0),
  shipping_fee        bigint not null check (shipping_fee >= 0),
  total               bigint not null generated always as (subtotal + shipping_fee) stored,
  shipping_provider   text not null check (shipping_provider in ('ghn', 'flat')),
  insurance_value     bigint not null default 0 check (insurance_value >= 0),

  payment_provider    text not null check (payment_provider in ('payos', 'demo')),
  payment_link_id     text,
  payment_checkout_url text,
  payment_qr          text,
  payment_account     jsonb,
  payment_expires_at  timestamptz not null,
  amount_paid         bigint not null default 0,
  payment_reference   text,
  paid_at             timestamptz,
  -- Set when money arrived but the order could not be fulfilled automatically
  -- (e.g. paid after expiry and the stock is gone, or underpaid).
  needs_attention     text,

  tracking_code       text,
  shipped_at          timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_pending_expiry_idx on public.orders (payment_expires_at) where status = 'pending_payment';

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid not null references public.products (id),
  slug        text not null,
  name        text not null,
  unit_price  bigint not null check (unit_price >= 0),
  quantity    integer not null check (quantity between 1 and 20),
  line_total  bigint generated always as (unit_price * quantity) stored
);

create index order_items_order_idx on public.order_items (order_id);

-- One row per bank transfer received; the unique reference makes webhook
-- replays harmless and lets several partial transfers add up.
create table public.order_payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  provider    text not null,
  reference   text not null,
  amount      bigint not null check (amount > 0),
  paid_at     timestamptz not null,
  created_at  timestamptz not null default now(),
  unique (provider, reference)
);

create index order_payments_order_idx on public.order_payments (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_payments enable row level security;
-- No policies: only the service role (server) reads or writes orders.

-- ---------------------------------------------------------------------------
-- Stock helpers
-- ---------------------------------------------------------------------------
create or replace function public.release_order_stock(p_order_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = p_order_id and i.product_id = p.id;
$$;

-- Returns false (and changes nothing) if any line lacks stock.
create or replace function public.reserve_order_stock(p_order_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  short integer;
begin
  -- Lock the product rows in a stable order to avoid deadlocks.
  perform 1 from public.products p
  where p.id in (select product_id from public.order_items where order_id = p_order_id)
  order by p.id
  for update;

  select count(*) into short
  from public.order_items i
  join public.products p on p.id = i.product_id
  where i.order_id = p_order_id and p.stock < i.quantity;

  if short > 0 then
    return false;
  end if;

  update public.products p
  set stock = p.stock - i.quantity
  from public.order_items i
  where i.order_id = p_order_id and i.product_id = p.id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order: create order + items with server-side prices, reserve stock.
-- p_order: { customer_*, address_line, province_name, district_name,
--            ward_name, ghn_district_id?, ghn_ward_code?, note?,
--            shipping_fee, shipping_provider, insurance_value,
--            payment_provider, payment_expires_at,
--            items: [{ product_id, quantity }] }
-- Raises 'insufficient_stock' / 'product_unavailable' (errcode P0001).
-- ---------------------------------------------------------------------------
create or replace function public.place_order(p_order jsonb)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
  item jsonb;
  prod public.products;
  v_subtotal bigint := 0;
begin
  if jsonb_typeof(p_order -> 'items') <> 'array' or jsonb_array_length(p_order -> 'items') = 0 then
    raise exception 'empty_order';
  end if;

  insert into public.orders (
    customer_name, customer_phone, customer_email, address_line,
    province_name, district_name, ward_name, ghn_district_id, ghn_ward_code, note,
    subtotal, shipping_fee, shipping_provider, insurance_value,
    payment_provider, payment_expires_at
  ) values (
    p_order ->> 'customer_name', p_order ->> 'customer_phone', nullif(p_order ->> 'customer_email', ''),
    p_order ->> 'address_line', p_order ->> 'province_name', p_order ->> 'district_name', p_order ->> 'ward_name',
    (p_order ->> 'ghn_district_id')::integer, p_order ->> 'ghn_ward_code', nullif(p_order ->> 'note', ''),
    0, (p_order ->> 'shipping_fee')::bigint, p_order ->> 'shipping_provider',
    coalesce((p_order ->> 'insurance_value')::bigint, 0),
    p_order ->> 'payment_provider', (p_order ->> 'payment_expires_at')::timestamptz
  )
  returning * into o;

  for item in select * from jsonb_array_elements(p_order -> 'items') loop
    select * into prod from public.products
    where id = (item ->> 'product_id')::uuid and is_active;
    if not found then
      raise exception 'product_unavailable';
    end if;
    insert into public.order_items (order_id, product_id, slug, name, unit_price, quantity)
    values (o.id, prod.id, prod.slug, prod.name, prod.price, (item ->> 'quantity')::integer);
    v_subtotal := v_subtotal + prod.price * (item ->> 'quantity')::integer;
  end loop;

  if not public.reserve_order_stock(o.id) then
    raise exception 'insufficient_stock';
  end if;

  update public.orders set subtotal = v_subtotal where id = o.id returning * into o;
  return o;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_order_payment: called from the verified payment webhook.
-- Idempotent per (provider, reference); partial transfers add up.
-- Returns null for unknown order codes (e.g. the PayOS test webhook).
-- ---------------------------------------------------------------------------
create or replace function public.record_order_payment(
  p_order_code bigint,
  p_provider text,
  p_reference text,
  p_amount bigint,
  p_paid_at timestamptz default now()
)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
  v_paid bigint;
  v_inserted integer;
begin
  select * into o from public.orders where order_code = p_order_code for update;
  if not found then
    return null;
  end if;

  insert into public.order_payments (order_id, provider, reference, amount, paid_at)
  values (o.id, p_provider, p_reference, p_amount, p_paid_at)
  on conflict (provider, reference) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return o; -- replayed webhook
  end if;

  select coalesce(sum(amount), 0) into v_paid from public.order_payments where order_id = o.id;

  if o.status in ('paid', 'shipped', 'completed') then
    -- Extra money on a settled order.
    update public.orders
    set amount_paid = v_paid,
        needs_attention = format('Received %s VND more than the order total: refund the difference.', v_paid - o.total)
    where id = o.id
    returning * into o;
    return o;
  end if;

  if v_paid < o.total then
    update public.orders
    set amount_paid = v_paid,
        payment_reference = p_reference,
        needs_attention = format('Underpaid: received %s of %s VND.', v_paid, o.total)
    where id = o.id
    returning * into o;
    return o;
  end if;

  -- Fully paid. If the order had been released, try to reserve stock again.
  if o.status in ('expired', 'cancelled') and not public.reserve_order_stock(o.id) then
    o.needs_attention := format('Paid after the order was %s and stock is no longer available: refund or restock.', o.status);
  else
    o.needs_attention := null;
  end if;
  if v_paid > o.total then
    o.needs_attention := concat_ws(' ', o.needs_attention,
      format('Overpaid by %s VND: refund the difference.', v_paid - o.total));
  end if;

  update public.orders
  set status = 'paid', amount_paid = v_paid, payment_reference = p_reference, paid_at = p_paid_at,
      cancelled_at = null, needs_attention = o.needs_attention
  where id = o.id
  returning * into o;
  return o;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_order / expire_stale_orders: release reserved stock.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return null;
  end if;
  if o.status <> 'pending_payment' then
    raise exception 'cannot_cancel_%', o.status;
  end if;
  if o.amount_paid > 0 then
    raise exception 'has_payments'; -- money received: refund first, never silently cancel
  end if;
  perform public.release_order_stock(o.id);
  update public.orders set status = 'cancelled', cancelled_at = now() where id = o.id returning * into o;
  return o;
end;
$$;

create or replace function public.expire_stale_orders(p_now timestamptz default now())
returns integer
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
  n integer := 0;
begin
  for o in
    select * from public.orders
    where status = 'pending_payment' and payment_expires_at < p_now
    for update skip locked
  loop
    perform public.release_order_stock(o.id);
    update public.orders set status = 'expired' where id = o.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function
  public.place_order(jsonb),
  public.record_order_payment(bigint, text, text, bigint, timestamptz),
  public.cancel_order(uuid),
  public.expire_stale_orders(timestamptz),
  public.reserve_order_stock(uuid),
  public.release_order_stock(uuid)
from public, anon, authenticated;

grant execute on function
  public.place_order(jsonb),
  public.record_order_payment(bigint, text, text, bigint, timestamptz),
  public.cancel_order(uuid),
  public.expire_stale_orders(timestamptz)
to service_role;
