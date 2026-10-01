/**
 * Production wiring for the durable generation runner. Server-only: talks to
 * Supabase with the service role and to Anthropic/OpenAI.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { generateStoryPages } from "@/lib/generate-story";
import {
  downloadReferencePhotos,
  generateCoverArt,
  generatePageIllustration,
  illustrationObjectExists,
  persistCoverPng,
  persistPreviewPage,
  persistWatermarkedPreviewFromMaster,
} from "@/lib/generate-illustrations";
import { personalizedBookCopy } from "@/lib/book-title";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTrackBySlug } from "@/lib/tracks";
import { parseStoryType } from "@/lib/personalization";
import {
  GENERATION_STEP_LEASE_SECONDS,
  GENERATION_STEPS,
  isGenerationStepId,
  previewStepId,
  retryDelayMs,
  type GenerationStepRow,
} from "@/lib/generation-steps";
import type { BookSnapshot, GenerationDeps } from "@/lib/generation-workflow";
import { CoverVerificationError } from "@/lib/cover-prompt";
import type { BookGenerationStepStatus, Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const ILLUSTRATION_BUCKET = "book-illustrations";

type StepRecord = {
  book_id: string;
  step: string;
  status: GenerationStepRow["status"];
  attempts: number;
  max_attempts: number;
  lease_token: string | null;
  lease_expires_at: string | null;
  next_retry_at: string | null;
  last_error: string | null;
  artifact_path: string | null;
};

function asStepRow(record: StepRecord): GenerationStepRow | null {
  if (!isGenerationStepId(record.step)) return null;
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
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value.filter((page): page is string => typeof page === "string");
  return pages.length > 0 ? pages : null;
}

function asIllustrationArray(value: unknown): (string | null)[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((entry) => (typeof entry === "string" && entry.trim() ? entry : null));
}

export async function seedGenerationSteps(
  bookId: string,
  options?: { skipPictures?: boolean },
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return;
  const rows = GENERATION_STEPS.map((step) => {
    const status: BookGenerationStepStatus =
      options?.skipPictures && step !== "story" ? "complete" : "pending";
    return { book_id: bookId, step, status };
  });
  const { error } = await supabase.from("book_generation_steps").upsert(rows, {
    onConflict: "book_id,step",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("Failed to seed generation steps", error);
    throw error;
  }
}

/**
 * Inspected recovery only: release held / expired-running steps for one book
 * so drainGeneration may claim them. Does not set generation_auto_run.
 */
export async function armInspectedRecovery(bookId: string): Promise<number> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return 0;
  const now = new Date().toISOString();
  const held = await supabase
    .from("book_generation_steps")
    .update({
      status: "pending",
      last_error: null,
      lease_token: null,
      lease_expires_at: null,
      next_retry_at: null,
      updated_at: now,
    })
    .eq("book_id", bookId)
    .eq("status", "held")
    .select("step");
  if (held.error) throw held.error;

  const expired = await supabase
    .from("book_generation_steps")
    .update({
      status: "pending",
      last_error: null,
      lease_token: null,
      lease_expires_at: null,
      next_retry_at: null,
      updated_at: now,
    })
    .eq("book_id", bookId)
    .eq("status", "running")
    .lt("lease_expires_at", now)
    .select("step");
  if (expired.error) throw expired.error;

  return (held.data?.length ?? 0) + (expired.data?.length ?? 0);
}

export async function createGenerationRuntime(bookId: string): Promise<GenerationDeps | null> {
  const created = createAdminSupabaseClient();
  if (!created) return null;
  const db: SupabaseClient<Database> = created;

  let referenceImages: File[] | null = null;

  async function loadBook(): Promise<BookSnapshot> {
    const { data: book, error } = await db
      .from("books")
      .select(
        "id, order_id, status, pages, illustrations, cover_path, preview_generated, title, dedication, story_type, blueprint, continuity, page_plan",
      )
      .eq("id", bookId)
      .single();
    if (error || !book) throw new Error("Could not load the book for generation.");

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, track_id")
      .eq("id", book.order_id)
      .single();
    if (orderError || !order) throw new Error("Could not load the order for generation.");

    const { data: trackRow } = await db
      .from("tracks")
      .select("slug")
      .eq("id", order.track_id)
      .single();
    const trackSlug = trackRow?.slug ?? "alphabet";

    const { data: childRows } = await db
      .from("book_children")
      .select("child_name, child_age, photo_path, sort_order, interests, custom_interest, personal_note")
      .eq("order_id", order.id)
      .order("sort_order", { ascending: true });

    const children = (childRows ?? []).map((child) => ({
      name: child.child_name,
      age: child.child_age,
      photoPath: child.photo_path ?? "",
      interestIds: child.interests ?? [],
      customInterest: child.custom_interest,
      personalNote: child.personal_note,
    }));

    return {
      id: book.id,
      orderId: book.order_id,
      status: book.status,
      pages: asStringArray(book.pages),
      illustrations: asIllustrationArray(book.illustrations),
      coverPath: book.cover_path,
      previewGenerated: Boolean(book.preview_generated),
      title: book.title,
      dedication: book.dedication,
      storyType: book.story_type,
      blueprint: book.blueprint,
      continuity: book.continuity,
      pagePlan: book.page_plan,
      trackSlug,
      children,
    };
  }

  async function referencesFor(book: BookSnapshot): Promise<File[]> {
    if (referenceImages) return referenceImages;
    const loaded = await downloadReferencePhotos(book.children);
    referenceImages = loaded.map((entry) => entry.file);
    return referenceImages;
  }

  return {
    now: () => Date.now(),
    newLeaseToken: () => randomUUID(),
    loadSteps: async () => {
      const { data, error } = await db
        .from("book_generation_steps")
        .select(
          "book_id, step, status, attempts, max_attempts, lease_token, lease_expires_at, next_retry_at, last_error, artifact_path",
        )
        .eq("book_id", bookId);
      if (error) throw error;
      return (data ?? []).flatMap((row) => {
        const mapped = asStepRow(row as StepRecord);
        return mapped ? [mapped] : [];
      });
    },
    claimStep: async (stepId) => {
      const { data, error } = await db.rpc("claim_book_generation_step", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: randomUUID(),
        p_lease_seconds: GENERATION_STEP_LEASE_SECONDS,
      });
      if (error) throw error;
      if (!data) return null;
      return asStepRow(data as StepRecord);
    },
    completeStep: async (stepId, artifactPath, leaseToken) => {
      const { data, error } = await db.rpc("complete_book_generation_step", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: leaseToken,
        p_artifact_path: artifactPath,
      });
      if (error) throw error;
      return Boolean(data);
    },
    failStep: async (stepId, message, leaseToken) => {
      const { data: current } = await db
        .from("book_generation_steps")
        .select("attempts")
        .eq("book_id", bookId)
        .eq("step", stepId)
        .maybeSingle();
      const attempts = current?.attempts ?? 1;
      const { data, error } = await db.rpc("fail_book_generation_step", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: leaseToken,
        p_error: message.slice(0, 500),
        p_next_retry_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
      });
      if (error) throw error;
      return Boolean(data);
    },
    holdStep: async (stepId, message, leaseToken) => {
      const { data, error } = await db.rpc("hold_book_generation_step", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: leaseToken,
        p_error: message.slice(0, 500),
      });
      if (error) throw error;
      return Boolean(data);
    },
    loadBook,
    hasObject: (path) => illustrationObjectExists(path),
    generateStory: async (book) => {
      const track = getTrackBySlug(book.trackSlug);
      if (!track) throw new Error("Unknown theme.");
      const storyType = parseStoryType(book.storyType ?? "");
      return generateStoryPages(
        track,
        book.children.map((child) => ({
          name: child.name,
          age: child.age,
          interests: child.interestIds,
          customInterest: child.customInterest,
          personalNote: child.personalNote,
        })),
        storyType,
      );
    },
    saveStory: async (pages, extras, leaseToken) => {
      const { data, error } = await db.rpc("save_book_story_if_lease", {
        p_book_id: bookId,
        p_lease_token: leaseToken,
        p_pages: pages,
        p_blueprint: extras.blueprint as Database["public"]["Tables"]["books"]["Update"]["blueprint"],
        p_continuity: extras.continuity as Database["public"]["Tables"]["books"]["Update"]["continuity"],
        p_page_plan: extras.pagePlan as Database["public"]["Tables"]["books"]["Update"]["page_plan"],
      });
      if (error) throw error;
      return Boolean(data);
    },
    generateCover: async (book) => {
      const track = getTrackBySlug(book.trackSlug);
      if (!track) throw new Error("Unknown theme.");
      const images = await referencesFor(book);
      const { title } = personalizedBookCopy(book.children, track);
      try {
        const cover = await generateCoverArt({
          track,
          children: book.children,
          referenceImages: images,
          title,
        });
        return cover.png;
      } catch (error) {
        if (error instanceof CoverVerificationError) throw error;
        throw error;
      }
    },
    uploadCover: async (_path, png, leaseToken) => {
      await persistCoverPng(bookId, png, { updateBook: false });
      const { data, error } = await db.rpc("save_book_cover_if_lease", {
        p_book_id: bookId,
        p_lease_token: leaseToken,
        p_cover_path: _path,
      });
      if (error) throw error;
      return Boolean(data);
    },
    adoptExistingCover: async (path, leaseToken) => {
      const { data, error } = await db.rpc("save_book_cover_if_lease", {
        p_book_id: bookId,
        p_lease_token: leaseToken,
        p_cover_path: path,
      });
      if (error) throw error;
      return Boolean(data);
    },
    generatePage: async (pageIndex, book) => {
      const track = getTrackBySlug(book.trackSlug);
      if (!track) throw new Error("Unknown theme.");
      if (!book.pages?.[pageIndex]) throw new Error("Story page is missing.");
      const images = await referencesFor(book);
      const pagePlan = Array.isArray(book.pagePlan) ? book.pagePlan : [];
      const scene = pagePlan[pageIndex] as { scene_description?: string } | undefined;
      return generatePageIllustration({
        track,
        children: book.children,
        referenceImages: images,
        pageText: book.pages[pageIndex],
        pageIndex,
        pageCount: book.pages.length,
        sceneDescription: scene?.scene_description ?? null,
        continuity: (book.continuity as Parameters<typeof generatePageIllustration>[0]["continuity"]) ?? null,
      });
    },
    uploadPage: async (pageIndex, previewPath, png, leaseToken) => {
      const stepId = previewStepId(pageIndex);
      if (!stepId) return false;
      await persistPreviewPage(bookId, pageIndex, png, { updateBook: false });
      const { data, error } = await db.rpc("save_book_illustration_if_lease", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: leaseToken,
        p_page_index: pageIndex,
        p_preview_path: previewPath,
      });
      if (error) throw error;
      return Boolean(data);
    },
    adoptExistingPage: async (pageIndex, previewPath, leaseToken) => {
      const stepId = previewStepId(pageIndex);
      if (!stepId) return false;
      const { data, error } = await db.rpc("save_book_illustration_if_lease", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: leaseToken,
        p_page_index: pageIndex,
        p_preview_path: previewPath,
      });
      if (error) throw error;
      return Boolean(data);
    },
    materializePreviewFromMaster: async (pageIndex, leaseToken) => {
      const stepId = previewStepId(pageIndex);
      if (!stepId) return false;
      const previewPath = await persistWatermarkedPreviewFromMaster(bookId, pageIndex);
      if (!previewPath) return false;
      const { data, error } = await db.rpc("save_book_illustration_if_lease", {
        p_book_id: bookId,
        p_step: stepId,
        p_lease_token: leaseToken,
        p_page_index: pageIndex,
        p_preview_path: previewPath,
      });
      if (error) throw error;
      return Boolean(data);
    },
    setBookStatus: async (status) => {
      const { error } = await db.from("books").update({ status }).eq("id", bookId);
      if (error) throw error;
    },
    markPreviewGenerated: async (value) => {
      const { error } = await db
        .from("books")
        .update({ preview_generated: value })
        .eq("id", bookId);
      if (error) throw error;
    },
  };
}

export { ILLUSTRATION_BUCKET };
