-- Story Kiddo Custom Books — preview illustrations
--
-- Run after 20260831100000_book_illustrations.sql. Safe to re-run.
-- Tracks whether the 2-page watermarked preview has been painted.
-- Full-book (post-payment) generation is a later feature.

alter table public.books
  add column if not exists preview_generated boolean not null default false;

comment on column public.books.preview_generated is
  'True once the first two watermarked preview illustrations are stored. Full-book images are generated later, after payment.';
