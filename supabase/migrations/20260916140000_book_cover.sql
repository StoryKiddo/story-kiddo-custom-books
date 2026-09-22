-- Story Kiddo Custom Books — cover art
--
-- Run after 20260915193000_order_number.sql. Safe to re-run.
--
-- The cover is generated as its own picture, with the title and the child's
-- name lettered into the artwork, so it is stored apart from the page
-- illustrations. `dedication` is the giver line painted at the foot of it.

alter table public.books
  add column if not exists cover_path text,
  add column if not exists dedication text;

comment on column public.books.cover_path is
  'Storage path in book-illustrations for the generated cover, whose title lettering is part of the artwork.';

comment on column public.books.dedication is
  'Giver line painted onto the cover, e.g. "From Mom and Dad". Null uses the default.';
