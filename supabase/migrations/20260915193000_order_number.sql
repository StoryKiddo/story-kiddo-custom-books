-- Story Kiddo Custom Books — customer-facing six-digit order numbers
--
-- Forward-only. Do not edit earlier migrations.
-- orders.id stays the UUID primary key and route identifier.
-- orders.order_number is a persistent integer in 100000–999999.
-- The sequence does not cycle: exhausting the range fails instead of reusing a number.

create sequence if not exists public.orders_order_number_seq
  as integer
  increment by 1
  minvalue 100000
  maxvalue 999999
  start with 100000
  no cycle;

alter table public.orders
  add column if not exists order_number integer;

comment on column public.orders.order_number is
  'Customer-facing six-digit order number (100000–999999). Distinct from orders.id, which remains the UUID primary key and route identifier.';

-- Refuse to silently reuse numbers if existing rows cannot fit in the range.
do $$
declare
  existing_count integer;
begin
  select count(*) into existing_count from public.orders where order_number is null;
  if existing_count > 900000 then
    raise exception
      'Cannot assign unique six-digit order numbers: % unnumbered orders exceed the 900000 available values',
      existing_count;
  end if;
end $$;

-- Backfill in deterministic created_at, id order before the column becomes NOT NULL.
-- Start after any numbers already assigned so a partial re-run cannot collide.
with numbered as (
  select
    id,
    coalesce((select max(order_number) from public.orders), 99999)
      + row_number() over (order by created_at asc, id asc) as next_number
  from public.orders
  where order_number is null
)
update public.orders as o
set order_number = numbered.next_number
from numbered
where o.id = numbered.id;

do $$
begin
  if exists (
    select 1
    from public.orders
    where order_number is null
       or order_number < 100000
       or order_number > 999999
  ) then
    raise exception 'order_number backfill produced null or out-of-range values';
  end if;
end $$;

-- Point the sequence after the highest assigned number so new inserts do not collide.
-- Empty table: coalesce to 99999 so the next nextval() is 100000.
select setval(
  'public.orders_order_number_seq',
  coalesce((select max(order_number) from public.orders), 99999),
  true
);

alter table public.orders
  alter column order_number set default nextval('public.orders_order_number_seq');

alter table public.orders
  alter column order_number set not null;

alter sequence public.orders_order_number_seq
  owned by public.orders.order_number;

alter table public.orders
  drop constraint if exists orders_order_number_range;

alter table public.orders
  add constraint orders_order_number_range
  check (order_number >= 100000 and order_number <= 999999);

alter table public.orders
  drop constraint if exists orders_order_number_key;

alter table public.orders
  add constraint orders_order_number_key unique (order_number);
