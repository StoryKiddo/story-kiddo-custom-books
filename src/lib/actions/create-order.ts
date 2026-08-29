/**
 * Server Action that turns the create-book form into a customer, order, and
 * pending book row (and uploads each child's photo).
 *
 * If Supabase env vars are missing, we still complete the flow in "demo mode"
 * so the frontend can be tried without a live project.
 */

"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { formatBookTitle, MAX_CHILDREN_PER_BOOK } from "@/lib/orders";
import { generateStoryPages, isAnthropicConfigured } from "@/lib/generate-story";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTrackBySlug, type Track } from "@/lib/tracks";

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

type ParsedChild = {
  name: string;
  age: number;
  photo: File;
};

function parseChildren(
  formData: FormData,
): { children: ParsedChild[] } | { error: string } {
  const names = formData.getAll("childName").map(asString);
  const ages = formData.getAll("childAge").map(asString);
  const photos = formData.getAll("photo");

  if (names.length < 1 || names.length > MAX_CHILDREN_PER_BOOK) {
    return { error: "Please add between 1 and 4 children to this book." };
  }
  if (ages.length !== names.length || photos.length !== names.length) {
    return { error: "Each child needs a name, age, and photo." };
  }

  const children: ParsedChild[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (name.length < 1 || name.length > 40) {
      return { error: "Please enter each child's first name (up to 40 characters)." };
    }
    const age = Number.parseInt(ages[i] ?? "", 10);
    if (!Number.isInteger(age) || age < 0 || age > 12) {
      return { error: "Please enter an age between 0 and 12 for each child." };
    }
    const photo = photos[i];
    if (!(photo instanceof File) || photo.size === 0) {
      return { error: "Please upload a photo of each child." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "That photo is a bit large — please use a file under 8 MB." };
    }
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return { error: "Please upload a JPG, PNG, or WebP photo." };
    }
    children.push({ name, age, photo });
  }

  return { children };
}

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const trackSlug = asString(formData.get("track"));
  const parsed = parseChildren(formData);

  const track = getTrackBySlug(trackSlug);
  if (!track) {
    return { error: "Please choose an educational theme before continuing." };
  }

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const { children } = parsed;

  // Without a live Supabase project, skip persistence and still show a
  // confirmation page so the frontend flow can be reviewed end to end.
  if (!isSupabaseConfigured()) {
    const demoId = `demo-${randomUUID()}`;
    const params = new URLSearchParams({
      demo: "1",
      track: track.slug,
    });
    for (const child of children) {
      params.append("childName", child.name);
      params.append("childAge", String(child.age));
    }
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
        "We couldn't find that theme in the database. Run the SQL in supabase/migrations/ on your project.",
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

  const uploaded: { name: string; age: number; photoPath: string }[] = [];
  for (const child of children) {
    const photoPath = `${customer.id}/${randomUUID()}.${photoExtension(child.photo)}`;
    const photoBuffer = Buffer.from(await child.photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("child-photos")
      .upload(photoPath, photoBuffer, {
        contentType: child.photo.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: "We couldn't upload that photo. Please try a different image." };
    }

    uploaded.push({ name: child.name, age: child.age, photoPath });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      track_id: trackRow.id,
      status: "received",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: "We saved the photo but couldn't create the order. Please try again." };
  }

  const { error: childrenError } = await supabase.from("book_children").insert(
    uploaded.map((child, index) => ({
      order_id: order.id,
      child_name: child.name,
      child_age: child.age,
      photo_path: child.photoPath,
      sort_order: index,
    })),
  );

  if (childrenError) {
    return { error: "The order was created, but we couldn't save the children. Please try again." };
  }

  // Stub book row — story text is filled in after redirect when Anthropic is configured.
  const { data: book, error: bookError } = await supabase.from("books").insert({
    order_id: order.id,
    title: formatBookTitle(
      uploaded.map((child) => ({ name: child.name, age: child.age })),
      track.name,
    ),
    status: "pending",
  }).select("id").single();

  if (bookError || !book) {
    return { error: "The order was created, but we couldn't start the book yet. Please contact us." };
  }

  if (isAnthropicConfigured()) {
    await supabase.from("books").update({ status: "generating" }).eq("id", book.id);
    const storyChildren = uploaded.map((child) => ({ name: child.name, age: child.age }));
    scheduleStoryGeneration(book.id, track, storyChildren);
  }

  redirect(`/order/${order.id}`);
}

function scheduleStoryGeneration(
  bookId: string,
  track: Track,
  children: { name: string; age: number }[],
) {
  after(async () => {
    const admin = createAdminSupabaseClient();
    if (!admin) return;

    try {
      const pages = await generateStoryPages(track, children);
      const { error: storyError } = await admin
        .from("books")
        .update({
          status: "complete",
          pages,
          page_count: pages.length,
        })
        .eq("id", bookId);

      if (storyError) {
        console.error("Failed to save generated story", storyError);
        await admin.from("books").update({ status: "failed" }).eq("id", bookId);
      }
    } catch (error) {
      console.error("Story generation failed", error);
      await admin.from("books").update({ status: "failed" }).eq("id", bookId);
    }
  });
}
