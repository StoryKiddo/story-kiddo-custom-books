-- Story Kiddo Custom Books — page illustrations
--
-- Run after the earlier migrations. Safe to re-run.
-- Adds illustration storage paths on books and a private bucket for the images.

alter table public.books
  add column if not exists illustrations jsonb;

comment on column public.books.illustrations is
  'JSON array of storage paths in book-illustrations, one entry per story page (null if that page has no image yet).';

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'books'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';

  if constraint_name is not null then
    execute format('alter table public.books drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.books
  add constraint books_status_check
  check (status in ('pending', 'generating', 'illustrating', 'complete', 'failed'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-illustrations',
  'book-illustrations',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
