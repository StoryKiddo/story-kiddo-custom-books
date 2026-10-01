/**
 * Loads an order for the confirmation page.
 * Demo orders (ids that start with `demo-`) never hit the database.
 */

import { personalizedBookCopy, printableDedication } from "@/lib/book-title";
import { orderNumberFromDemoId } from "@/lib/order-number";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTrackBySlug, type Track } from "@/lib/tracks";
import type { BookStatus } from "@/lib/supabase/types";
import { visiblePreviewSlice } from "@/lib/personalization";
import { illustrationPathsToSign } from "@/lib/generation-status";
import {
  describeGenerationPhase,
  type GenerationPhase,
  type GenerationStepRow,
} from "@/lib/generation-steps";
import type { BookGenerationStepRow } from "@/lib/supabase/types";

export const MAX_CHILDREN_PER_BOOK = 4;

export type OrderChild = {
  name: string;
  age: number;
};

export type OrderSummary = {
  id: string;
  orderNumber: number;
  /** When the order was placed, for the live "being made" counter. */
  createdAt: string | null;
  children: OrderChild[];
  track: Track;
  isDemo: boolean;
  bookTitle: string;
  bookSubtitle: string | null;
  status: string;
  bookStatus: BookStatus;
  pages: string[] | null;
  illustrationUrls: (string | null)[] | null;
  /** Signed URL of the generated cover, whose title is lettered into the art. */
  coverUrl: string | null;
  /** Optional note for a dedication page inside the book. Null means none. */
  dedication: string | null;
  previewGenerated: boolean;
  generationResumeToken: string | null;
  generationPhase: GenerationPhase | null;
};

function asPages(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value.filter((page): page is string => typeof page === "string" && page.trim().length > 0);
  return pages.length > 0 ? pages : null;
}

async function signStoragePath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from("book-illustrations")
    .createSignedUrl(path, 60 * 60);
  return error ? null : data?.signedUrl ?? null;
}

async function signIllustrationUrls(
  paths: (string | null)[] | null,
): Promise<(string | null)[] | null> {
  if (!paths || paths.length === 0) return paths;
  const supabase = createAdminSupabaseClient();
  if (!supabase) return paths.map(() => null);

  const urls: (string | null)[] = [];
  for (const path of paths) {
    if (!path) {
      urls.push(null);
      continue;
    }
    const { data, error } = await supabase.storage
      .from("book-illustrations")
      .createSignedUrl(path, 60 * 60);
    urls.push(error ? null : data?.signedUrl ?? null);
  }
  return urls;
}

function allValues(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function formatStarsLine(children: OrderChild[], trackName: string): string {
  const bits = children.map((child) => `${child.name}, age ${child.age}`);
  const theme = trackName.toLowerCase();
  if (bits.length === 1) {
    return `${bits[0]}, is the star of this ${theme} story.`;
  }
  return `${joinAnd(bits)} are the stars of this ${theme} story.`;
}

export async function getOrderSummary(
  id: string,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<OrderSummary | null> {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  if (id.startsWith("demo-") || first(searchParams.demo) === "1") {
    const track = getTrackBySlug(first(searchParams.track));
    const names = allValues(searchParams.childName);
    const ages = allValues(searchParams.childAge);
    if (!track || names.length < 1 || names.length !== ages.length) return null;

    const children: OrderChild[] = [];
    for (let i = 0; i < names.length; i++) {
      const age = Number.parseInt(ages[i] ?? "", 10);
      if (!names[i] || Number.isNaN(age)) return null;
      children.push({ name: names[i], age });
    }

    const copy = personalizedBookCopy(children, track);
    return {
      id,
      orderNumber: orderNumberFromDemoId(id),
      createdAt: null,
      children,
      track,
      isDemo: true,
      bookTitle: copy.title,
      bookSubtitle: copy.subtitle,
      status: "received",
      bookStatus: "pending",
      pages: null,
      illustrationUrls: null,
      coverUrl: null,
      dedication: printableDedication(first(searchParams.dedication)),
      previewGenerated: false,
      generationResumeToken: null,
      generationPhase: null,
    };
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, child_name, child_age, status, track_id, created_at")
    .eq("id", id)
    .single();

  if (error || !order) return null;

  const { data: trackRow } = await supabase
    .from("tracks")
    .select("slug")
    .eq("id", order.track_id)
    .single();

  const track = getTrackBySlug(trackRow?.slug);
  if (!track) return null;

  const { data: childRows } = await supabase
    .from("book_children")
    .select("child_name, child_age, sort_order")
    .eq("order_id", order.id)
    .order("sort_order", { ascending: true });

  const children: OrderChild[] =
    childRows && childRows.length > 0
      ? childRows.map((row) => ({ name: row.child_name, age: row.child_age }))
      : order.child_name != null && order.child_age != null
        ? [{ name: order.child_name, age: order.child_age }]
        : [];

  if (children.length === 0) return null;

  const { data: book } = await supabase
    .from("books")
    .select("id, status, pages, illustrations, title, preview_generated")
    .eq("order_id", order.id)
    .maybeSingle();

  const coverUrl = await signStoragePath(await loadCoverPath(book?.id));
  const dedication = printableDedication(await loadDedication(book?.id));
  const generation = await loadGenerationMeta(book?.id);

  const pages = visiblePreviewSlice(asPages(book?.pages) ?? []);
  const bookStatus: BookStatus = book?.status ?? "pending";
  const illustrationUrls = await signIllustrationUrls(
    illustrationPathsToSign(bookStatus, book?.illustrations),
  );
  const copy = personalizedBookCopy(children, track);

  return {
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at ?? null,
    children,
    track,
    isDemo: false,
    bookTitle: copy.title,
    bookSubtitle: copy.subtitle,
    status: order.status,
    bookStatus,
    pages: pages.length > 0 ? pages : null,
    illustrationUrls,
    coverUrl,
    dedication,
    previewGenerated: Boolean(book?.preview_generated),
    generationResumeToken: generation.resumeToken,
    generationPhase: generation.phase,
  };
}

/**
 * Read in its own query so a database that has not run the cover migration
 * yet still loads the rest of the order instead of failing the whole select.
 */
async function loadCoverPath(bookId: string | undefined): Promise<string | null> {
  if (!bookId) return null;
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("books")
    .select("cover_path")
    .eq("id", bookId)
    .maybeSingle();
  if (error) return null;
  return data?.cover_path ?? null;
}

async function loadDedication(bookId: string | undefined): Promise<string | null> {
  if (!bookId) return null;
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("books")
    .select("dedication")
    .eq("id", bookId)
    .maybeSingle();
  if (error) return null;
  return data?.dedication ?? null;
}

async function loadGenerationMeta(
  bookId: string | undefined,
): Promise<{ resumeToken: string | null; phase: GenerationPhase | null }> {
  if (!bookId) return { resumeToken: null, phase: null };
  const supabase = createAdminSupabaseClient();
  if (!supabase) return { resumeToken: null, phase: null };

  const { data: tokenRow, error: tokenError } = await supabase
    .from("books")
    .select("generation_resume_token, generation_auto_run")
    .eq("id", bookId)
    .maybeSingle();
  const autoRun = Boolean(tokenRow?.generation_auto_run);
  const resumeToken =
    tokenError || !autoRun ? null : tokenRow?.generation_resume_token ?? null;

  const { data: stepRows, error: stepError } = await supabase
    .from("book_generation_steps")
    .select(
      "book_id, step, status, attempts, max_attempts, lease_token, lease_expires_at, next_retry_at, last_error, artifact_path",
    )
    .eq("book_id", bookId);
  if (stepError || !stepRows || stepRows.length === 0) {
    return { resumeToken, phase: null };
  }

  const steps: GenerationStepRow[] = stepRows.map((row) => {
    const record = row as BookGenerationStepRow;
    return {
      bookId: record.book_id,
      step: record.step,
      status: record.status,
      attempts: record.attempts,
      maxAttempts: record.max_attempts,
      leaseToken: record.lease_token,
      leaseExpiresAt: record.lease_expires_at,
      nextRetryAt: record.next_retry_at,
      lastError: record.last_error,
      artifactPath: record.artifact_path,
    };
  });

  return { resumeToken, phase: describeGenerationPhase(steps, Date.now()) };
}
