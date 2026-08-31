/**
 * Loads an order for the confirmation page.
 * Demo orders (ids that start with `demo-`) never hit the database.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTrackBySlug, type Track } from "@/lib/tracks";
import type { BookStatus } from "@/lib/supabase/types";

export const MAX_CHILDREN_PER_BOOK = 4;

export type OrderChild = {
  name: string;
  age: number;
};

export type OrderSummary = {
  id: string;
  children: OrderChild[];
  track: Track;
  isDemo: boolean;
  bookTitle: string;
  status: string;
  bookStatus: BookStatus;
  pages: string[] | null;
  illustrationUrls: (string | null)[] | null;
};

function asPages(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value.filter((page): page is string => typeof page === "string" && page.trim().length > 0);
  return pages.length > 0 ? pages : null;
}

function asIllustrationPaths(value: unknown): (string | null)[] | null {
  if (!Array.isArray(value)) return null;
  const paths = value.map((entry) =>
    typeof entry === "string" && entry.trim().length > 0 ? entry : null,
  );
  return paths.some((path) => path) ? paths : null;
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

export function formatBookTitle(children: OrderChild[], trackName: string): string {
  const names = children.map((child) => child.name);
  return `${joinAnd(names)}'s ${trackName} Book`;
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

    return {
      id,
      children,
      track,
      isDemo: true,
      bookTitle: formatBookTitle(children, track.name),
      status: "received",
      bookStatus: "pending",
      pages: null,
      illustrationUrls: null,
    };
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, child_name, child_age, status, track_id")
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
    .select("status, pages, illustrations, title")
    .eq("order_id", order.id)
    .maybeSingle();

  const pages = asPages(book?.pages);
  const bookStatus: BookStatus = book?.status ?? "pending";
  const illustrationUrls = await signIllustrationUrls(asIllustrationPaths(book?.illustrations));

  return {
    id: order.id,
    children,
    track,
    isDemo: false,
    bookTitle: book?.title || formatBookTitle(children, track.name),
    status: order.status,
    bookStatus,
    pages,
    illustrationUrls,
  };
}
