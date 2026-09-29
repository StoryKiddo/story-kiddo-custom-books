-- Story Kiddo Custom Books — durable generation steps
--
-- Run AFTER the earlier migrations. Safe to re-run.
-- Adds per-step leases so story, cover, and each preview page can resume
-- after a serverless timeout without repeating completed model calls.
--
-- Applying this file in the Supabase SQL editor is required. Deploying the
-- Next.js app does NOT apply this migration.
--
-- Existing books are NOT auto-resumed. Incomplete steps seed as 'held' and
-- books.generation_auto_run defaults to false. The stuck order
-- 2678ceb9-e58f-4ad8-b41b-fc4fd00c279d will not call an image model until
-- inspected recovery releases its held steps. New orders set
-- generation_auto_run = true at create time.

-- Per-order token the order page uses to POST a generation tick.
-- Knowing the order UUID is not enough to start a model call.
alter table public.books
  add column if not exists generation_resume_token uuid not null default gen_random_uuid();

comment on column public.books.generation_resume_token is
  'Secret presented only on the order page. Required to continue generation. Never returned from GET /generation-status.';

-- When false, POST /generation-tick refuses to start model calls.
-- Existing books stay false. New orders set true at create time.
alter table public.books
  add column if not exists generation_auto_run boolean not null default false;

comment on column public.books.generation_auto_run is
  'When false, POST /generation-tick refuses to start model calls. Existing books stay false. New orders set true at create time.';

create table if not exists public.book_generation_steps (
  book_id uuid not null references public.books (id) on delete cascade,
  step text not null check (step in ('story', 'cover', 'page_0', 'page_1')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'complete', 'failed', 'held')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  lease_token uuid,
  lease_expires_at timestamptz,
  next_retry_at timestamptz,
  last_error text,
  artifact_path text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (book_id, step)
);

comment on table public.book_generation_steps is
  'One recoverable generation stage per book. Claimed with a lease so two tabs cannot bill the same image twice. held = paused for inspected recovery; never auto-billed.';

alter table public.book_generation_steps drop constraint if exists book_generation_steps_status_check;
alter table public.book_generation_steps
  add constraint book_generation_steps_status_check
  check (status in ('pending', 'running', 'complete', 'failed', 'held'));

create index if not exists book_generation_steps_lease_idx
  on public.book_generation_steps (status, lease_expires_at);

alter table public.book_generation_steps enable row level security;

-- No anon/authenticated policies: only the service role (Next.js server) can read or write.

create or replace function public.generation_step_owns_lease(
  p_book_id uuid,
  p_step text,
  p_lease_token uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.book_generation_steps
    where book_id = p_book_id
      and step = p_step
      and lease_token = p_lease_token
      and status = 'running'
  );
$$;

create or replace function public.claim_book_generation_step(
  p_book_id uuid,
  p_step text,
  p_lease_token uuid,
  p_lease_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.book_generation_steps;
begin
  -- 360s production lease must be allowed (create-page maxDuration is 300s).
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 420 then
    raise exception 'lease seconds out of range';
  end if;

  update public.book_generation_steps s
  set
    status = 'running',
    lease_token = p_lease_token,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempts = s.attempts + 1,
    last_error = null,
    updated_at = now()
  where s.book_id = p_book_id
    and s.step = p_step
    and s.attempts < s.max_attempts
    and (
      s.status = 'pending'
      -- Only the cheap story step may be reclaimed after expiry. Image steps
      -- that outlive their lease are held for manual review, never auto-reclaimed.
      or (
        s.status = 'running'
        and s.step = 'story'
        and s.lease_expires_at is not null
        and s.lease_expires_at < now()
      )
      or (s.status = 'failed' and (s.next_retry_at is null or s.next_retry_at <= now()))
    )
  returning * into claimed;

  if claimed.book_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'book_id', claimed.book_id,
    'step', claimed.step,
    'status', claimed.status,
    'attempts', claimed.attempts,
    'max_attempts', claimed.max_attempts,
    'lease_token', claimed.lease_token,
    'lease_expires_at', claimed.lease_expires_at,
    'next_retry_at', claimed.next_retry_at,
    'last_error', claimed.last_error,
    'artifact_path', claimed.artifact_path
  );
end;
$$;

create or replace function public.complete_book_generation_step(
  p_book_id uuid,
  p_step text,
  p_lease_token uuid,
  p_artifact_path text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update public.book_generation_steps
  set
    status = 'complete',
    artifact_path = p_artifact_path,
    lease_token = null,
    lease_expires_at = null,
    last_error = null,
    completed_at = now(),
    updated_at = now()
  where book_id = p_book_id
    and step = p_step
    and lease_token = p_lease_token
    and status = 'running'
  returning book_id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function public.fail_book_generation_step(
  p_book_id uuid,
  p_step text,
  p_lease_token uuid,
  p_error text,
  p_next_retry_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update public.book_generation_steps
  set
    status = 'failed',
    last_error = left(p_error, 500),
    next_retry_at = p_next_retry_at,
    lease_token = null,
    updated_at = now()
  where book_id = p_book_id
    and step = p_step
    and lease_token = p_lease_token
    and status = 'running'
  returning book_id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function public.hold_book_generation_step(
  p_book_id uuid,
  p_step text,
  p_lease_token uuid,
  p_error text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update public.book_generation_steps
  set
    status = 'held',
    last_error = left(p_error, 500),
    lease_token = null,
    lease_expires_at = null,
    next_retry_at = null,
    updated_at = now()
  where book_id = p_book_id
    and step = p_step
    and lease_token = p_lease_token
    and status = 'running'
  returning book_id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function public.save_book_cover_if_lease(
  p_book_id uuid,
  p_lease_token uuid,
  p_cover_path text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.generation_step_owns_lease(p_book_id, 'cover', p_lease_token) then
    return false;
  end if;
  update public.books set cover_path = p_cover_path where id = p_book_id;
  return true;
end;
$$;

create or replace function public.save_book_illustration_if_lease(
  p_book_id uuid,
  p_step text,
  p_lease_token uuid,
  p_page_index integer,
  p_preview_path text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_step text;
  updated_id uuid;
begin
  if p_page_index = 0 then
    expected_step := 'page_0';
  elsif p_page_index = 1 then
    expected_step := 'page_1';
  else
    return false;
  end if;

  if p_step is distinct from expected_step then
    return false;
  end if;

  -- A master-only object is not a finished preview. Refuse empty paths and
  -- any path that is not the watermarked preview object.
  if p_preview_path is null
     or position('/preview/' in p_preview_path) = 0
     or position('/master/' in p_preview_path) > 0 then
    return false;
  end if;

  -- Lock the book row so parallel page_0 / page_1 writers serialize. Do not
  -- read illustrations into a variable and write it back: that lost-update
  -- race overwrote the sibling page. jsonb_set below uses the column as of
  -- this locked row version.
  perform 1 from public.books where id = p_book_id for update;
  if not found then
    return false;
  end if;

  update public.books b
  set illustrations = jsonb_set(
    (
      select coalesce(
        jsonb_agg(
          coalesce(
            (
              case
                when jsonb_typeof(b.illustrations) = 'array' then b.illustrations
                else '[]'::jsonb
              end
            ) -> i,
            'null'::jsonb
          )
          order by i
        ),
        '[]'::jsonb
      )
      from generate_series(
        0,
        greatest(
          case
            when jsonb_typeof(b.illustrations) = 'array' then jsonb_array_length(b.illustrations)
            else 0
          end,
          coalesce(b.page_count, 0),
          p_page_index + 1
        ) - 1
      ) as i
    ),
    array[p_page_index::text],
    to_jsonb(p_preview_path),
    true
  )
  where b.id = p_book_id
    and exists (
      select 1
      from public.book_generation_steps s
      where s.book_id = p_book_id
        and s.step = p_step
        and s.lease_token = p_lease_token
        and s.status = 'running'
    )
  returning b.id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function public.save_book_story_if_lease(
  p_book_id uuid,
  p_lease_token uuid,
  p_pages jsonb,
  p_blueprint jsonb,
  p_continuity jsonb,
  p_page_plan jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.generation_step_owns_lease(p_book_id, 'story', p_lease_token) then
    return false;
  end if;
  update public.books
  set
    pages = p_pages,
    page_count = jsonb_array_length(p_pages),
    preview_generated = false,
    blueprint = p_blueprint,
    continuity = p_continuity,
    page_plan = p_page_plan
  where id = p_book_id;
  return true;
end;
$$;

revoke all on function public.generation_step_owns_lease(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.generation_step_owns_lease(uuid, text, uuid) to service_role;

revoke all on function public.claim_book_generation_step(uuid, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_book_generation_step(uuid, text, uuid, integer) to service_role;

revoke all on function public.complete_book_generation_step(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_book_generation_step(uuid, text, uuid, text) to service_role;

revoke all on function public.fail_book_generation_step(uuid, text, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.fail_book_generation_step(uuid, text, uuid, text, timestamptz) to service_role;

revoke all on function public.hold_book_generation_step(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.hold_book_generation_step(uuid, text, uuid, text) to service_role;

revoke all on function public.save_book_cover_if_lease(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_book_cover_if_lease(uuid, uuid, text) to service_role;

revoke all on function public.save_book_illustration_if_lease(uuid, text, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.save_book_illustration_if_lease(uuid, text, uuid, integer, text) to service_role;

revoke all on function public.save_book_story_if_lease(uuid, uuid, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_book_story_if_lease(uuid, uuid, jsonb, jsonb, jsonb, jsonb) to service_role;

-- Seed steps for books that already exist. Completed artifacts win over status
-- flags. Incomplete work is held — never pending — so opening an old order
-- page cannot start a paid image call.
insert into public.book_generation_steps (book_id, step, status, attempts, artifact_path, last_error, completed_at)
select
  b.id,
  'story',
  case
    when b.pages is not null and jsonb_typeof(b.pages) = 'array' and jsonb_array_length(b.pages) > 0
      then 'complete'
    else 'held'
  end,
  case
    when b.pages is not null and jsonb_typeof(b.pages) = 'array' and jsonb_array_length(b.pages) > 0
      then 1
    else 0
  end,
  null,
  case
    when b.pages is not null and jsonb_typeof(b.pages) = 'array' and jsonb_array_length(b.pages) > 0
      then null
    else 'Existing book: automatic generation is off. Resume only through inspected recovery.'
  end,
  case
    when b.pages is not null and jsonb_typeof(b.pages) = 'array' and jsonb_array_length(b.pages) > 0
      then now()
    else null
  end
from public.books b
on conflict (book_id, step) do nothing;

insert into public.book_generation_steps (book_id, step, status, attempts, artifact_path, last_error, completed_at)
select
  b.id,
  'cover',
  case when b.cover_path is not null and length(b.cover_path) > 0 then 'complete' else 'held' end,
  case when b.cover_path is not null and length(b.cover_path) > 0 then 1 else 0 end,
  b.cover_path,
  case
    when b.cover_path is not null and length(b.cover_path) > 0 then null
    else 'Existing book: automatic generation is off. Resume only through inspected recovery.'
  end,
  case when b.cover_path is not null and length(b.cover_path) > 0 then now() else null end
from public.books b
on conflict (book_id, step) do nothing;

insert into public.book_generation_steps (book_id, step, status, attempts, artifact_path, last_error, completed_at)
select
  b.id,
  'page_0',
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 0
      and nullif(b.illustrations ->> 0, '') is not null
      then 'complete'
    else 'held'
  end,
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 0
      and nullif(b.illustrations ->> 0, '') is not null
      then 1
    else 0
  end,
  nullif(b.illustrations ->> 0, ''),
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 0
      and nullif(b.illustrations ->> 0, '') is not null
      then null
    else 'Existing book: automatic generation is off. Resume only through inspected recovery.'
  end,
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 0
      and nullif(b.illustrations ->> 0, '') is not null
      then now()
    else null
  end
from public.books b
on conflict (book_id, step) do nothing;

insert into public.book_generation_steps (book_id, step, status, attempts, artifact_path, last_error, completed_at)
select
  b.id,
  'page_1',
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 1
      and nullif(b.illustrations ->> 1, '') is not null
      then 'complete'
    else 'held'
  end,
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 1
      and nullif(b.illustrations ->> 1, '') is not null
      then 1
    else 0
  end,
  nullif(b.illustrations ->> 1, ''),
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 1
      and nullif(b.illustrations ->> 1, '') is not null
      then null
    else 'Existing book: automatic generation is off. Resume only through inspected recovery.'
  end,
  case
    when jsonb_typeof(b.illustrations) = 'array'
      and jsonb_array_length(b.illustrations) > 1
      and nullif(b.illustrations ->> 1, '') is not null
      then now()
    else null
  end
from public.books b
on conflict (book_id, step) do nothing;
