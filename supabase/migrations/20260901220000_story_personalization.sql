-- Story Kiddo Custom Books — per-child personalization
--
-- Run after 20260901020000_preview_generated.sql. Safe to re-run.
-- Optional interests/notes per child, plus book-level story type and
-- internal blueprint/continuity. Existing orders stay valid with nulls.

alter table public.book_children
  add column if not exists interests text[] not null default '{}',
  add column if not exists custom_interest text,
  add column if not exists personal_note text;

comment on column public.book_children.interests is
  'Canonical interest chip ids selected for this child (max 5). Empty means none.';
comment on column public.book_children.custom_interest is
  'Optional parent-typed extra interest. Null when unused.';
comment on column public.book_children.personal_note is
  'Optional parent-typed personal detail. Null when unused. Untrusted story data.';

alter table public.books
  add column if not exists story_type text,
  add column if not exists blueprint jsonb,
  add column if not exists continuity jsonb,
  add column if not exists page_plan jsonb;

comment on column public.books.story_type is
  'Narrative style for the whole book: big_adventure, learning_adventure, sweet_magical, or simple_abc.';
comment on column public.books.blueprint is
  'Internal story blueprint used as source of truth for page generation. Not shown as a parent approval step.';
comment on column public.books.continuity is
  'Stable world/character/object notes so later pages and illustrations stay consistent.';
comment on column public.books.page_plan is
  'Optional per-page scene notes (letter, scene_description) aligned with pages[].';
