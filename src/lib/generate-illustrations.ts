/**
 * Server-only helper that paints watermarked preview illustrations for the
 * first two story pages with gpt-image-2. Never import this file from a
 * Client Component.
 */

import "server-only";
import OpenAI, { toFile } from "openai";
import type { Track } from "@/lib/tracks";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildImageEditRequestFields,
  buildIllustrationPrompt,
  describeIllustrationApiError,
  previewIllustrationCount,
  type IllustrationChild,
} from "@/lib/illustration-prompt";
import { applyPreviewWatermark } from "@/lib/illustration-watermark";

const ILLUSTRATION_BUCKET = "book-illustrations";
const PHOTO_BUCKET = "child-photos";

export type { IllustrationChild };

export function getOpenAIApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : null;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

function photoFilename(path: string, index: number): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const safe = ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg" ? ext : "jpg";
  return `child-${index + 1}.${safe === "jpeg" ? "jpg" : safe}`;
}

function mimeFromPath(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function downloadReferencePhotos(
  children: IllustrationChild[],
): Promise<{ child: IllustrationChild; file: File }[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const files: { child: IllustrationChild; file: File }[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(child.photoPath);
    if (error || !data) {
      throw new Error(`Could not load the photo for ${child.name}.`);
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    const file = await toFile(bytes, photoFilename(child.photoPath, i), {
      type: data.type || mimeFromPath(child.photoPath),
    });
    files.push({ child, file });
  }
  return files;
}

export async function generatePageIllustration(options: {
  track: Track;
  children: IllustrationChild[];
  referenceImages: File[];
  pageText: string;
  pageIndex: number;
  pageCount: number;
}): Promise<Buffer> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const prompt = buildIllustrationPrompt(
    options.track,
    options.children,
    options.pageText,
    options.pageIndex,
    options.pageCount,
  );

  let result;
  try {
    result = await client.images.edit({
      ...buildImageEditRequestFields(prompt),
      image: options.referenceImages,
    });
  } catch (error) {
    const described = describeIllustrationApiError(error);
    if (described.isAccessError) {
      console.error(described.message);
    }
    throw new Error(described.message);
  }

  const item = result.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error("Could not download the generated illustration.");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("The image model returned no image data.");
}

export async function illustrateBook(options: {
  bookId: string;
  track: Track;
  pages: string[];
  children: IllustrationChild[];
}): Promise<(string | null)[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const references = await downloadReferencePhotos(options.children);
  const referenceImages = references.map((entry) => entry.file);
  const illustrations: (string | null)[] = options.pages.map(() => null);
  const previewCount = previewIllustrationCount(options.pages.length);

  for (let i = 0; i < previewCount; i++) {
    try {
      const png = await generatePageIllustration({
        track: options.track,
        children: options.children,
        referenceImages,
        pageText: options.pages[i],
        pageIndex: i,
        pageCount: options.pages.length,
      });
      const watermarked = await applyPreviewWatermark(png);
      const path = `${options.bookId}/page-${String(i + 1).padStart(2, "0")}.png`;
      const { error: uploadError } = await supabase.storage
        .from(ILLUSTRATION_BUCKET)
        .upload(path, watermarked, {
          contentType: "image/png",
          upsert: true,
        });
      if (uploadError) {
        throw uploadError;
      }
      illustrations[i] = path;
    } catch (error) {
      console.error(`Illustration failed for page ${i + 1}`, error);
    }

    const { error: saveError } = await supabase
      .from("books")
      .update({ illustrations })
      .eq("id", options.bookId);
    if (saveError) {
      console.error("Failed to save illustration progress", saveError);
    }
  }

  return illustrations;
}
