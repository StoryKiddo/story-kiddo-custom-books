/**
 * Server Action that turns the create-book form into a customer, order, and
 * pending book row (and uploads the child's photo).
 *
 * If Supabase env vars are missing, we still complete the flow in "demo mode"
 * so the frontend can be tried without a live project.
 */

"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTrackBySlug } from "@/lib/tracks";

export type CreateOrderState = {
  error?: string;
} | null;

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function photoExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const trackSlug = asString(formData.get("track"));
  const childName = asString(formData.get("childName"));
  const ageRaw = asString(formData.get("childAge"));
  const photo = formData.get("photo");

  const track = getTrackBySlug(trackSlug);
  if (!track) {
    return { error: "Please choose an educational track before continuing." };
  }

  if (childName.length < 1 || childName.length > 40) {
    return { error: "Please enter your child's first name (up to 40 characters)." };
  }

  const childAge = Number.parseInt(ageRaw, 10);
  if (!Number.isInteger(childAge) || childAge < 0 || childAge > 12) {
    return { error: "Please enter an age between 0 and 12." };
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Please upload a photo of your child." };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: "That photo is a bit large — please use a file under 8 MB." };
  }
  if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
    return { error: "Please upload a JPG, PNG, or WebP photo." };
  }

  // Without a live Supabase project, skip persistence and still show a
  // confirmation page so the frontend flow can be reviewed end to end.
  if (!isSupabaseConfigured()) {
    const demoId = `demo-${randomUUID()}`;
    const params = new URLSearchParams({
      demo: "1",
      childName,
      childAge: String(childAge),
      track: track.slug,
    });
    redirect(`/order/${demoId}?${params.toString()}`);
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { error: "Supabase is not configured. Add the keys from .env.example to .env.local." };
  }

  const { data: trackRow, error: trackError } = await supabase
    .from("tracks")
    .select("id")
    .eq("slug", track.slug)
    .single();

  if (trackError || !trackRow) {
    return {
      error:
        "We couldn't find that track in the database. Run the SQL in supabase/migrations/ on your project.",
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({})
    .select("id")
    .single();

  if (customerError || !customer) {
    return { error: "We couldn't save this order. Please try again in a moment." };
  }

  const photoPath = `${customer.id}/${randomUUID()}.${photoExtension(photo)}`;
  const photoBuffer = Buffer.from(await photo.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("child-photos")
    .upload(photoPath, photoBuffer, {
      contentType: photo.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: "We couldn't upload that photo. Please try a different image." };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      track_id: trackRow.id,
      child_name: childName,
      child_age: childAge,
      photo_path: photoPath,
      status: "received",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: "We saved the photo but couldn't create the order. Please try again." };
  }

  // Stub book row — illustration generation will update this later.
  const { error: bookError } = await supabase.from("books").insert({
    order_id: order.id,
    title: `${childName}'s ${track.name} Book`,
    status: "pending",
  });

  if (bookError) {
    return { error: "The order was created, but we couldn't start the book yet. Please contact us." };
  }

  redirect(`/order/${order.id}`);
}
