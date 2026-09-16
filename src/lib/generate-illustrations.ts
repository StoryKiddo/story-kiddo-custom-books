/**
 * Server-only helper that paints illustrations for the first two story pages
 * with gpt-image-2. The image model returns a clean master. A watermarked
 * preview derivative is created afterwards and stored separately. Never import
 * this file from a Client Component.
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
import {
  masterIllustrationObjectPath,
  previewIllustrationObjectPath,
  stampCustomerPreview,
} from "@/lib/illustration-watermark";
import type { BookContinuity, PagePlanItem } from "@/lib/story-blueprint";
import { coverLockup, dedicationLine, personalizedBookCopy } from "@/lib/book-title";
import {
  COVER_PROOF_MODEL,
  buildCoverPrompt,
  buildCoverRequestFields,
  coverObjectPath,
  coverProofIssues,
  repaintNote,
  shouldRepaintCover,
} from "@/lib/cover-prompt";

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
  sceneDescription?: string | null;
  continuity?: BookContinuity | null;
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
    {
      sceneDescription: options.sceneDescription,
      continuity: options.continuity,
    },
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

  return imageFromResult(result);
}

async function imageFromResult(result: { data?: { b64_json?: string; url?: string }[] }): Promise<Buffer> {
  const item = result.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error("Could not download the generated image.");
    }
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error("The image model returned no image data.");
}

/**
 * Reads the text an image model painted onto a cover. Returns null when the
 * read-back itself fails — a proofing outage should not cost the customer
 * their cover, so callers treat null as "accept this one".
 */
async function readCoverText(client: OpenAI, png: Buffer): Promise<string | null> {
  try {
    const completion = await client.chat.completions.create({
      model: COVER_PROOF_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe every word of text you can see in this book cover image, exactly as it is spelled, one line per line of text. If there is no text, reply NONE.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${png.toString("base64")}` },
            },
          ],
        },
      ],
    });
    return completion.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("Cover proofing could not run; accepting the cover as painted", error);
    return null;
  }
}

/**
 * Paints the cover with the title lettered into the artwork, then proofreads
 * the lettering and repaints if a child's name came out wrong.
 */
export async function generateCoverArt(options: {
  track: Track;
  children: IllustrationChild[];
  referenceImages: File[];
  title: string;
  dedication: string;
}): Promise<{ png: Buffer; attempts: number; issues: string[] }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const lockup = coverLockup(options.title);
  const basePrompt = buildCoverPrompt({
    track: options.track,
    children: options.children,
    lockup,
    dedication: options.dedication,
  });
  const childNames = options.children.map((child) => child.name);

  let lastPng: Buffer | null = null;
  let issues: string[] = [];

  for (let attempt = 1; ; attempt++) {
    const prompt = attempt === 1 ? basePrompt : `${basePrompt}${repaintNote(issues)}`;
    let result;
    try {
      result = await client.images.edit({
        ...buildCoverRequestFields(prompt),
        image: options.referenceImages,
      });
    } catch (error) {
      const described = describeIllustrationApiError(error);
      if (described.isAccessError) {
        console.error(described.message);
      }
      throw new Error(described.message);
    }

    lastPng = await imageFromResult(result);

    const readText = await readCoverText(client, lastPng);
    if (readText === null) {
      return { png: lastPng, attempts: attempt, issues: [] };
    }

    issues = coverProofIssues({ readText, childNames, lockup });
    if (issues.length === 0) {
      return { png: lastPng, attempts: attempt, issues };
    }

    console.warn(`Cover attempt ${attempt} failed proofing: ${issues.join(" ")}`);
    if (!shouldRepaintCover(attempt, issues)) {
      return { png: lastPng, attempts: attempt, issues };
    }
  }
}

export async function illustrateBook(options: {
  bookId: string;
  track: Track;
  pages: string[];
  children: IllustrationChild[];
  dedication?: string | null;
  pagePlan?: PagePlanItem[];
  continuity?: BookContinuity | null;
}): Promise<(string | null)[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const references = await downloadReferencePhotos(options.children);
  const referenceImages = references.map((entry) => entry.file);

  // The cover comes first: it is the picture the customer sees at the top of
  // the preview, and its lettering is the part that has to be right.
  try {
    const { title } = personalizedBookCopy(options.children, options.track);
    const cover = await generateCoverArt({
      track: options.track,
      children: options.children,
      referenceImages,
      title,
      dedication: dedicationLine(options.dedication),
    });

    if (cover.issues.length > 0) {
      console.error(
        `Cover lettering still wrong after ${cover.attempts} attempts: ${cover.issues.join(" ")}`,
      );
    }

    const coverPath = coverObjectPath(options.bookId);
    const { error: coverUploadError } = await supabase.storage
      .from(ILLUSTRATION_BUCKET)
      .upload(coverPath, cover.png, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });
    if (coverUploadError) {
      throw coverUploadError;
    }

    const { error: coverSaveError } = await supabase
      .from("books")
      .update({ cover_path: coverPath })
      .eq("id", options.bookId);
    if (coverSaveError) {
      console.error("Failed to save the cover path", coverSaveError);
    }
  } catch (error) {
    // A missing cover is recoverable: the preview page says so and the story
    // pages below it still get painted.
    console.error("Cover generation failed", error);
  }

  const illustrations: (string | null)[] = options.pages.map(() => null);
  const previewCount = previewIllustrationCount(options.pages.length);

  for (let i = 0; i < previewCount; i++) {
    try {
      const masterPng = await generatePageIllustration({
        track: options.track,
        children: options.children,
        referenceImages,
        pageText: options.pages[i],
        pageIndex: i,
        pageCount: options.pages.length,
        sceneDescription: options.pagePlan?.[i]?.scene_description,
        continuity: options.continuity,
      });
      const masterPath = masterIllustrationObjectPath(options.bookId, i);
      const previewPath = previewIllustrationObjectPath(options.bookId, i);
      const previewPng = await stampCustomerPreview(masterPng);

      const { error: masterUploadError } = await supabase.storage
        .from(ILLUSTRATION_BUCKET)
        .upload(masterPath, masterPng, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: true,
        });
      if (masterUploadError) {
        throw masterUploadError;
      }

      const { error: previewUploadError } = await supabase.storage
        .from(ILLUSTRATION_BUCKET)
        .upload(previewPath, previewPng, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: true,
        });
      if (previewUploadError) {
        throw previewUploadError;
      }

      // Customer-facing books.illustrations always stores the watermarked preview.
      illustrations[i] = previewPath;
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
