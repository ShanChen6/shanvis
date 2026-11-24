-- Scenario tests for the order functions (migration 20261124000004).
-- Run against a fresh local database after migrations + seed, e.g.:
--   npx supabase db reset && psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/orders.sql
-- Expected results are described by each \echo line.
\set ON_ERROR_STOP 0
\pset tuples_only on
create temp table t_ids as select slug, id from products;
create function pg_temp.payload(items jsonb, expires timestamptz default now() + interval '15 min') returns jsonb language sql as $$
  select jsonb_build_object('customer_name','Nguyen Van A','customer_phone','0912345678','customer_email','a@b.vn',
    'address_line','12 Hang Bai','province_name','Ha Noi','district_name','Hoan Kiem','ward_name','Hang Bai',
    'shipping_fee',50000,'shipping_provider','flat','insurance_value',5000000,'payment_provider','demo',
    'payment_expires_at',expires,'items',items) $$;
create function pg_temp.line(slug text, q int) returns jsonb language sql as $$
  select jsonb_build_object('product_id',(select id from t_ids where t_ids.slug=$1),'quantity',$2,'unit_price',1) $$;

\echo '1 place: subtotal from DB prices (client unit_price ignored), stock reserved'
select order_code, subtotal, total, status from place_order(pg_temp.payload(jsonb_build_array(pg_temp.line('sony-a7-iv',2), pg_temp.line('sony-fe-35mm-f1-8',1))));
select slug, stock from products where slug in ('sony-a7-iv','sony-fe-35mm-f1-8') order by slug;
\echo '2 insufficient stock: whole order rolled back'
select place_order(pg_temp.payload(jsonb_build_array(pg_temp.line('sony-fe-35mm-f1-8',1), pg_temp.line('sony-fe-24-70mm-f2-8-gm-ii',5))));
select 'orders', count(*) from orders; select 'fe35 stock', stock from products where slug='sony-fe-35mm-f1-8';
\echo '3 partial transfer, replay ignored, remainder completes'
select status, amount_paid, needs_attention from record_order_payment(100001,'payos','REF1',18520000);
select status, amount_paid from record_order_payment(100001,'payos','REF1',18520000);
select 'cancel with money', cancel_order((select id from orders where order_code=100001));
select status, amount_paid, needs_attention is null from record_order_payment(100001,'payos','REF2',100000000);
select 'payments rows', count(*) from order_payments;
\echo '4 extra transfer on a paid order is flagged'
select status, amount_paid, needs_attention from record_order_payment(100001,'payos','REF3',5000);
\echo '5 unknown order code ignored'
select 'unknown is null', (record_order_payment(123,'payos','TEST',3000)).id is null;
\echo '6 expiry releases stock, late full payment re-reserves'
select order_code from place_order(pg_temp.payload(jsonb_build_array(pg_temp.line('canon-rf-50mm-f1-8-stm',3)), now() - interval '1 min'));
select 'expired', expire_stale_orders(); select 'rf50 released', stock from products where slug='canon-rf-50mm-f1-8-stm';
select status, needs_attention from record_order_payment(100003,'payos','LATE',(select total from orders where order_code=100003));
select 'rf50 re-reserved', stock from products where slug='canon-rf-50mm-f1-8-stm';
\echo '7 late payment with stock gone is flagged, stock never negative'
select order_code from place_order(pg_temp.payload(jsonb_build_array(pg_temp.line('fujifilm-x100vi',3)), now() - interval '1 min'));
select expire_stale_orders(); update products set stock = 0 where slug='fujifilm-x100vi';
select status, needs_attention from record_order_payment(100004,'payos','LATE2',(select total from orders where order_code=100004));
select 'x100 stock', stock from products where slug='fujifilm-x100vi';
\echo '8 cancel releases stock; paid orders cannot be cancelled'
select order_code from place_order(pg_temp.payload(jsonb_build_array(pg_temp.line('nikon-z6-iii',1))));
select status from cancel_order((select id from orders where order_code=100005));
select 'z6 back', stock from products where slug='nikon-z6-iii';
select cancel_order((select id from orders where order_code=100001));
\echo '9 anon locked out'
set role anon; select count(*) from orders; select record_order_payment(100001,'payos','x',1); reset role;
