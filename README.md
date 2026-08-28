# Story Kiddo Custom Books

A Next.js app for personalized educational storybooks starring a child.

This first version covers the **frontend flow** and the **database structure**. AI illustration is not built yet.

## What you can do today

1. Land on a simple homepage.
2. Choose one of eight educational tracks (alphabet, numbers, colors/shapes, emotions, kindness/values, life milestones, animals/nature, manners).
3. Upload a photo and enter the child's name and age.
4. See an order confirmation.

If Supabase keys are missing, the same flow still works in **demo mode** (nothing is saved). With keys configured, the app writes `customers`, `orders`, and `books` rows and stores the photo in a private bucket.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional until you have a Supabase project
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/20260828120000_init.sql`. That file creates the four tables, seeds the tracks, and adds a private `child-photos` storage bucket.
3. Copy **Project URL**, **anon key**, and **service role key** from Project Settings → API into `.env.local`.

The service role key is used only on the server (see `src/lib/supabase/admin.ts`) so photo uploads and order inserts can bypass Row Level Security. Do not prefix it with `NEXT_PUBLIC_`.

## Project map

| Path | What it is |
| --- | --- |
| `src/app/page.tsx` | Homepage |
| `src/app/tracks/page.tsx` | Track picker |
| `src/app/create/page.tsx` | Child photo / name / age form |
| `src/app/order/[id]/page.tsx` | Order confirmation |
| `src/lib/tracks.ts` | The 8 tracks (keep in sync with the SQL seed) |
| `src/lib/actions/create-order.ts` | Server Action that saves the order |
| `src/lib/supabase/` | Supabase clients and TypeScript table types |
| `supabase/migrations/` | Schema for `customers`, `orders`, `tracks`, `books` |

## Scripts

```bash
npm run dev      # local development
npm run lint     # ESLint
npm run build    # production build
```
