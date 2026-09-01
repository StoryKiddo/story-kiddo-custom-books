/**
 * Server Action that turns the create-book form into a customer, order, and
 * pending book row (and uploads each child's photo).
 *
 * If Supabase env vars are missing, we still complete the flow in "demo mode"
 * so the frontend can be tried without a live project.
 *
 * Expected failures are returned as `{ error }` so the form stays mounted.
 * Unexpected throws are caught and mapped to a specific message — except
 * Next's `redirect()`, which must be rethrown. If the order and children
 * are already saved, later hiccups redirect to the confirmation page
 * instead of looking like a lost order.
 */

"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { redirect } from "next/navigation";
import {
  CREATE_ORDER_MESSAGES,
  isAllowedPhotoType,
  isNextRedirectError,
  isPhotoOverSizeLimit,
  messageForCreateOrderFailure,
  messageForPhotoUploadFailure,
} from "@/lib/create-order-errors";
import { formatBookTitle, MAX_CHILDREN_PER_BOOK } from "@/lib/orders";
import { generateStoryPages, isAnthropicConfigured } from "@/lib/generate-story";
import {
  illustrateBook,
  isOpenAIConfigured,
} from "@/lib/generate-illustrations";
import { previewGenerationSucceeded } from "@/lib/illustration-prompt";
import {
  normalizeCustomInterest,
  normalizeInterestIds,
  normalizePersonalNote,
  parseStoryType,
  type StoryTypeId,
} from "@/lib/personalization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTrackBySlug, type Track } from "@/lib/tracks";

export type CreateOrderState = {
  error?: string;
} | null;

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
  interestIds: string[];
  customInterest: string | null;
  personalNote: string | null;
};

function parseChildren(
  formData: FormData,
): { children: ParsedChild[]; storyType: StoryTypeId } | { error: string } {
  const names = formData.getAll("childName").map(asString);
  const ages = formData.getAll("childAge").map(asString);
  const photos = formData.getAll("photo");
  const customInterests = formData.getAll("customInterest").map(asString);
  const personalNotes = formData.getAll("personalNote").map(asString);
  const storyType = parseStoryType(asString(formData.get("storyType")));

  if (names.length < 1 || names.length > MAX_CHILDREN_PER_BOOK) {
    return { error: CREATE_ORDER_MESSAGES.childCount };
  }
  if (ages.length !== names.length || photos.length !== names.length) {
    return { error: CREATE_ORDER_MESSAGES.childIncomplete };
  }

  const children: ParsedChild[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (name.length < 1 || name.length > 40) {
      return { error: CREATE_ORDER_MESSAGES.nameInvalid };
    }
    const age = Number.parseInt(ages[i] ?? "", 10);
    if (!Number.isInteger(age) || age < 0 || age > 12) {
      return { error: CREATE_ORDER_MESSAGES.ageInvalid };
    }
    const photo = photos[i];
    if (!(photo instanceof File) || photo.size === 0) {
      return { error: CREATE_ORDER_MESSAGES.photoMissing };
    }
    if (isPhotoOverSizeLimit(photo.size)) {
      return { error: CREATE_ORDER_MESSAGES.photoTooLarge };
    }
    if (!isAllowedPhotoType(photo.type)) {
      return { error: CREATE_ORDER_MESSAGES.photoType };
    }
    children.push({
      name,
      age,
      photo,
      interestIds: normalizeInterestIds(
        formData.getAll(`interests-${i}`).map(asString),
      ),
      customInterest: normalizeCustomInterest(customInterests[i] ?? ""),
      personalNote: normalizePersonalNote(personalNotes[i] ?? ""),
    });
  }

  return { children, storyType };
}

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  try {
    return await submitCreateOrder(formData);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("createOrder failed", error);
    return { error: messageForCreateOrderFailure(error) };
  }
}

async function submitCreateOrder(formData: FormData): Promise<CreateOrderState> {
  const trackSlug = asString(formData.get("track"));
  const parsed = parseChildren(formData);

  const track = getTrackBySlug(trackSlug);
  if (!track) {
    return { error: CREATE_ORDER_MESSAGES.themeMissing };
  }

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const { children, storyType } = parsed;

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
    return { error: CREATE_ORDER_MESSAGES.database };
  }

  const { data: trackRow, error: trackError } = await supabase
    .from("tracks")
    .select("id")
    .eq("slug", track.slug)
    .single();

  if (trackError || !trackRow) {
    return { error: CREATE_ORDER_MESSAGES.themeNotInDb };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({})
    .select("id")
    .single();

  if (customerError || !customer) {
    return { error: CREATE_ORDER_MESSAGES.database };
  }

  const uploaded: {
    name: string;
    age: number;
    photoPath: string;
    interestIds: string[];
    customInterest: string | null;
    personalNote: string | null;
  }[] = [];
  for (const child of children) {
    const photoPath = `${customer.id}/${randomUUID()}.${photoExtension(child.photo)}`;
    let photoBuffer: Buffer;
    try {
      photoBuffer = Buffer.from(await child.photo.arrayBuffer());
    } catch (error) {
      return { error: messageForCreateOrderFailure(error) };
    }

    const { error: uploadError } = await supabase.storage
      .from("child-photos")
      .upload(photoPath, photoBuffer, {
        contentType: child.photo.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: messageForPhotoUploadFailure(uploadError) };
    }

    uploaded.push({
      name: child.name,
      age: child.age,
      photoPath,
      interestIds: child.interestIds,
      customInterest: child.customInterest,
      personalNote: child.personalNote,
    });
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
    return { error: CREATE_ORDER_MESSAGES.database };
  }

  const childRows = uploaded.map((child, index) => ({
    order_id: order.id,
    child_name: child.name,
    child_age: child.age,
    photo_path: child.photoPath,
    sort_order: index,
    interests: child.interestIds,
    custom_interest: child.customInterest,
    personal_note: child.personalNote,
  }));

  let { error: childrenError } = await supabase.from("book_children").insert(childRows);
  if (childrenError) {
    const retry = await supabase.from("book_children").insert(childRows);
    childrenError = retry.error;
  }
  if (childrenError) {
    return { error: CREATE_ORDER_MESSAGES.childrenSave };
  }

  // Order + photos + children are durable from here. Anything after this
  // (book row, story generation) must not send the customer back to a
  // blank form — redirect to the confirmation page instead.
  try {
    const bookPayload = {
      order_id: order.id,
      title: formatBookTitle(
        uploaded.map((child) => ({ name: child.name, age: child.age })),
        track.name,
      ),
      status: "pending" as const,
      story_type: storyType,
    };

    let { data: book, error: bookError } = await supabase
      .from("books")
      .insert(bookPayload)
      .select("id")
      .single();

    if (bookError || !book) {
      const retry = await supabase.from("books").insert(bookPayload).select("id").single();
      book = retry.data;
    }

    if (book && isAnthropicConfigured()) {
      await supabase.from("books").update({ status: "generating" }).eq("id", book.id);
      scheduleStoryGeneration(book.id, track, uploaded, storyType);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("createOrder failed after the order was saved", error);
  }

  redirect(`/order/${order.id}`);
}

function scheduleStoryGeneration(
  bookId: string,
  track: Track,
  children: {
    name: string;
    age: number;
    photoPath: string;
    interestIds: string[];
    customInterest: string | null;
    personalNote: string | null;
  }[],
  storyType: StoryTypeId,
) {
  after(async () => {
    const admin = createAdminSupabaseClient();
    if (!admin) return;

    const childInputs = children.map((child) => ({
      name: child.name,
      age: child.age,
      interests: child.interestIds,
      customInterest: child.customInterest,
      personalNote: child.personalNote,
    }));

    try {
      let story;
      try {
        story = await generateStoryPages(track, childInputs, storyType);
      } catch (error) {
        console.error("Story generation failed, retrying once", error);
        story = await generateStoryPages(track, childInputs, storyType);
      }
      const pages = story.pages;
      const paintPictures = isOpenAIConfigured();
      const { error: storyError } = await admin
        .from("books")
        .update({
          status: paintPictures ? "illustrating" : "complete",
          pages,
          page_count: pages.length,
          preview_generated: false,
          story_type: storyType,
          blueprint: story.blueprint,
          continuity: story.continuity,
          page_plan: story.pagePlan,
        })
        .eq("id", bookId);

      if (storyError) {
        console.error("Failed to save generated story", storyError);
        await admin.from("books").update({ status: "failed" }).eq("id", bookId);
        return;
      }

      if (!paintPictures) return;

      try {
        let illustrations;
        try {
          illustrations = await illustrateBook({
            bookId,
            track,
            pages,
            children,
            pagePlan: story.pagePlan,
            continuity: story.continuity,
          });
        } catch (error) {
          console.error("Illustration generation failed, retrying once", error);
          illustrations = await illustrateBook({
            bookId,
            track,
            pages,
            children,
            pagePlan: story.pagePlan,
            continuity: story.continuity,
          });
        }
        const previewOk = previewGenerationSucceeded(illustrations, pages.length);
        await admin
          .from("books")
          .update({
            illustrations,
            preview_generated: previewOk,
            status: previewOk ? "complete" : "failed",
          })
          .eq("id", bookId);
      } catch (error) {
        console.error("Illustration generation failed", error);
        await admin.from("books").update({ status: "failed" }).eq("id", bookId);
      }
    } catch (error) {
      console.error("Story generation failed", error);
      await admin.from("books").update({ status: "failed" }).eq("id", bookId);
    }
  });
}
