# Story Kiddo Custom Books

A Next.js app for personalized educational storybooks starring a child.

This first version covers the **frontend flow**, **database structure**, **story text**, and **page illustrations**.

## What you can do today

1. Land on a simple homepage.
2. Choose one of eight educational tracks (alphabet, numbers, colors/shapes, emotions, kindness/values, life milestones, animals/nature, manners).
3. Upload a photo and enter each child's name and age (up to four children per book).
4. See an order confirmation — and, when Anthropic and OpenAI are configured, a generated story with illustrations.

If Supabase keys are missing, the same flow still works in **demo mode** (nothing is saved, and no story is generated). With Supabase configured, the app writes `customers`, `orders`, `book_children`, and `books` rows and stores photos in a private bucket. With `ANTHROPIC_API_KEY` set, it also writes story pages onto the book. With `OPENAI_API_KEY` set, it paints one illustration per page into a private `book-illustrations` bucket.

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
5. Optional: add `OPENAI_API_KEY` from the [OpenAI platform](https://platform.openai.com/) so page illustrations are generated after the story. Run `supabase/migrations/20260831100000_book_illustrations.sql` for the illustrations bucket.

The service role key is used only on the server (see `src/lib/supabase/admin.ts`) so photo uploads and order inserts can bypass Row Level Security. Do not prefix it with `NEXT_PUBLIC_`.

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
npm run lint     # ESLint
npm run build    # production build
```
