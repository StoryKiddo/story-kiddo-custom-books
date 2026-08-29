-- Story Kiddo Custom Books — multiple children per order
--
-- Run this after `20260828120000_init.sql`. Safe to re-run.
-- Moves child name / age / photo onto `book_children` so one order can
-- include 1–4 children. Existing orders.child_* columns stay, but become
-- nullable for older rows.

create table if not exists public.book_children (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  child_name text not null,
  child_age integer not null check (child_age >= 0 and child_age <= 12),
  photo_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.book_children is
  'Children starring in a book order. One order can have 1–4 rows.';
comment on column public.book_children.photo_path is
  'Object path inside the child-photos Storage bucket, not a public URL.';
comment on column public.book_children.sort_order is
  'Display order in the form and on the confirmation page (0-based).';

create index if not exists book_children_order_id_idx
  on public.book_children (order_id);

create unique index if not exists book_children_order_sort_idx
  on public.book_children (order_id, sort_order);

alter table public.book_children enable row level security;
-- No policies → only the service role (Next.js server) can access rows.

alter table public.orders
  alter column child_name drop not null;

alter table public.orders
  alter column child_age drop not null;

comment on table public.orders is
  'A personalization request: chosen educational track, plus 1–4 children in book_children.';

-- Copy any existing single-child orders into the new table.
insert into public.book_children (order_id, child_name, child_age, photo_path, sort_order)
select id, child_name, child_age, photo_path, 0
from public.orders
where child_name is not null
  and not exists (
    select 1 from public.book_children existing
    where existing.order_id = public.orders.id
  );
