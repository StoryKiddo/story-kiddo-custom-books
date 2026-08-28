/**
 * Loads an order for the confirmation page.
 * Demo orders (ids that start with `demo-`) never hit the database.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTrackBySlug, type Track } from "@/lib/tracks";

export type OrderSummary = {
  id: string;
  childName: string;
  childAge: number;
  track: Track;
  isDemo: boolean;
  bookTitle: string;
  status: string;
};

export async function getOrderSummary(
  id: string,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<OrderSummary | null> {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  if (id.startsWith("demo-") || first(searchParams.demo) === "1") {
    const track = getTrackBySlug(first(searchParams.track));
    const childName = first(searchParams.childName);
    const childAge = Number.parseInt(first(searchParams.childAge) ?? "", 10);
    if (!track || !childName || Number.isNaN(childAge)) return null;

    return {
      id,
      childName,
      childAge,
      track,
      isDemo: true,
      bookTitle: `${childName}'s ${track.name} Book`,
      status: "received",
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

  return {
    id: order.id,
    childName: order.child_name,
    childAge: order.child_age,
    track,
    isDemo: false,
    bookTitle: `${order.child_name}'s ${track.name} Book`,
    status: order.status,
  };
}
