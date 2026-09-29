# Story Kiddo Custom Books

A Next.js app for personalized educational storybooks starring a child.

This first version covers the **frontend flow**, **database structure**, **story text**, and **page illustrations**.

## What you can do today

1. Land on a simple homepage.
2. Choose one of eight educational tracks (alphabet, numbers, colors/shapes, emotions, kindness/values, life milestones, animals/nature, manners).
3. Upload a photo and enter each child's name and age (up to four children per book).
4. See an order confirmation — and, when Anthropic and OpenAI are configured, a generated story with illustrations.

If Supabase keys are missing, the same flow still works in **demo mode** (nothing is saved, and no story is generated). With Supabase configured, the app writes `customers`, `orders`, `book_children`, and `books` rows and stores photos in a private bucket. With `ANTHROPIC_API_KEY` set, it also writes story pages onto the book. With `OPENAI_API_KEY` set, it paints **watermarked preview illustrations for the first two pages** into a private `book-illustrations` bucket. Remaining pages stay text-only until the post-payment full-book flow exists.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional until you have a Supabase project
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the files in `supabase/migrations/` in order. They create the tables (including `book_children` for 1–4 children per order), seed the tracks, and add a private `child-photos` storage bucket.
3. Copy **Project URL**, **anon key**, and **service role key** from Project Settings → API into `.env.local`.
4. Optional: add `ANTHROPIC_API_KEY` from the [Anthropic console](https://console.anthropic.com/) so story text is generated after checkout.
5. Optional: add `OPENAI_API_KEY` from the [OpenAI platform](https://platform.openai.com/) so two watermarked preview illustrations are generated with `gpt-image-2` after the story. That model may require organization verification. Run `supabase/migrations/20260831100000_book_illustrations.sql` for the illustrations bucket and `supabase/migrations/20260901020000_preview_generated.sql` for the preview flag.

The service role key is used only on the server (see `src/lib/supabase/admin.ts`) so photo uploads and order inserts can bypass Row Level Security. Do not prefix it with `NEXT_PUBLIC_`.

## Durable generation rollout

Story, cover, and each preview page are separate leased steps in `book_generation_steps`. Deploying the app does **not** apply SQL.

1. Run `supabase/migrations/20260929180000_generation_steps.sql` in the Supabase SQL editor (production project).
2. Verify with:

```sql
select conname from pg_constraint
where conrelid = 'public.book_generation_steps'::regclass;
select proname from pg_proc
where proname in (
  'claim_book_generation_step',
  'complete_book_generation_step',
  'fail_book_generation_step',
  'hold_book_generation_step',
  'generation_step_owns_lease'
);
select generation_auto_run, status
from public.books
where order_id = '2678ceb9-e58f-4ad8-b41b-fc4fd00c279d';
select book_id, step, status, attempts, last_error
from public.book_generation_steps
where book_id = (
  select id from public.books
  where order_id = '2678ceb9-e58f-4ad8-b41b-fc4fd00c279d'
);
```

Existing books, including that stuck order, seed incomplete steps as `held` and keep `generation_auto_run = false`. Opening the order page will not start an image-model call.

3. Deploy the Next.js app after that SQL has succeeded.
4. New orders set `generation_auto_run = true` at create time and start generation through `after()` on create, then continue via `POST /api/orders/[id]/generation-tick` using a per-order resume token from the order page. `GET /api/orders/[id]/generation-status` is read-only and never starts a model call.

### Recover a stranded order (inspect first)

```bash
node --experimental-strip-types scripts/recover-generation.ts \
  --order-id 2678ceb9-e58f-4ad8-b41b-fc4fd00c279d
```

That command is read-only. It prints whether cover/master/preview objects already exist and which image-model calls a resume would make. Do not pass `--execute` until that report and likely costs are reviewed. Execution also requires `--confirm-order-id` with the same UUID. Execute releases **that one book's** held/expired steps to pending, then drains; it does not turn auto-run on for other orders.

### Caps and remaining URL-access risk

- Each step allows at most 3 attempts. Image steps that time out or outlive their lease go to `held` and do not retry on their own.
- `POST /generation-tick` requires the resume token, `generation_auto_run = true`, and a book status of pending/generating/illustrating. Complete and failed books are refused.
- Unauthenticated holders of a **new-order** confirmation URL can still read the resume token from the page HTML and POST ticks until those attempt caps are hit. That is the remaining URL-access billing risk. Old orders do not expose a working tick: auto-run stays off and the page does not receive a resume token.

### Rollback

1. Redeploy the previous app revision. Old code ignores `book_generation_steps`.
2. Leave the new table in place (harmless) or, only if you must: drop the claim/complete/fail/hold/owns/save functions, then `drop table public.book_generation_steps;`
3. Do not drop `books.generation_resume_token` while any in-flight order page still needs it.

## Project map

| Path | What it is |
| --- | --- |
| `src/app/page.tsx` | Homepage |
| `src/app/tracks/page.tsx` | Track picker |
| `src/app/create/page.tsx` | Child photo / name / age form (1–4 children) |
| `src/app/order/[id]/page.tsx` | Order confirmation |
| `src/lib/tracks.ts` | The 8 tracks (keep in sync with the SQL seed) |
| `src/lib/actions/create-order.ts` | Server Action that saves the order |
| `src/lib/supabase/` | Supabase clients and TypeScript table types |
| `supabase/migrations/` | Schema for `customers`, `orders`, `tracks`, `book_children`, `books` |

## Scripts

```bash
npm run dev      # local development
npm run test     # illustration prompt, preview limit, and watermark checks
npm run lint     # ESLint
npm run build    # production build
```
