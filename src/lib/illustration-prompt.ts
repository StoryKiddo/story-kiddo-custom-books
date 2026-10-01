/**
 * Prompt + request helpers for page illustrations.
 * Kept free of server-only so tests can cover the gpt-image-2 call shape.
 */

import type { Track } from "./tracks";

export const ILLUSTRATION_MODEL = "gpt-image-2" as const;
export const ILLUSTRATION_SIZE = "1024x1536" as const;
export const ILLUSTRATION_QUALITY = "medium" as const;
export const ILLUSTRATION_OUTPUT_FORMAT = "png" as const;

/** Only the first N pages are painted before payment. Remaining pages stay empty. */
export const PREVIEW_ILLUSTRATION_COUNT = 2;

export type IllustrationSlot = "image" | "loading" | "full-book" | "none";

/**
 * Craft and finish for customer books. Theme (setting, wardrobe, mood) comes
 * from the chosen story — do not force a mystical look onto every book.
 */
export const ART_STYLE = `Classic painterly children's storybook illustration: oil-and-gouache picture-book craft, visible brushwork, rich colour, warm paper texture, and a well-printed picture-book finish.
Follow this book's theme for setting, wardrobe, and mood. Do not force a mystical or enchanted look unless the theme calls for it.
Not plastic, not 3D-cartoon, not a CGI film still, not babyish, and not a photograph.`;

export type IllustrationChild = {
  name: string;
  age: number;
  photoPath: string;
};

export type ImageEditRequestFields = {
  model: typeof ILLUSTRATION_MODEL;
  prompt: string;
  size: typeof ILLUSTRATION_SIZE;
  quality: typeof ILLUSTRATION_QUALITY;
  output_format: typeof ILLUSTRATION_OUTPUT_FORMAT;
  n: 1;
};

/** Fields for client.images.edit besides the reference image files.
 *  gpt-image-2 always processes inputs at high fidelity — do not send input_fidelity. */
export function buildImageEditRequestFields(prompt: string): ImageEditRequestFields {
  return {
    model: ILLUSTRATION_MODEL,
    prompt,
    size: ILLUSTRATION_SIZE,
    quality: ILLUSTRATION_QUALITY,
    output_format: ILLUSTRATION_OUTPUT_FORMAT,
    n: 1,
  };
}

export const PAGE_COMPOSITIONS = [
  "close shot, low angle, child large in the foreground",
  "wide shot, child small in the landscape, lots of setting",
  "over-the-shoulder from behind, face still turned enough to read",
  "side profile in motion, medium shot",
  "bird's-eye looking down, child clearly readable in the frame",
  "two-shot at eye level (or a single child centred at eye level)",
] as const;

export function compositionForPage(pageIndex: number): (typeof PAGE_COMPOSITIONS)[number] {
  const length = PAGE_COMPOSITIONS.length;
  const index = ((pageIndex % length) + length) % length;
  return PAGE_COMPOSITIONS[index];
}

export type PreviousIllustrationPage = {
  text?: string | null;
  scene?: string | null;
};

export function buildIllustrationPrompt(
  track: Track,
  children: IllustrationChild[],
  pageText: string,
  pageIndex: number,
  pageCount: number,
  extras?: {
    sceneDescription?: string | null;
    previousPage?: PreviousIllustrationPage | null;
    continuity?: {
      world_description?: string | null;
      companion_characters?: string[];
      recurring_objects?: string[];
      clothing?: string | null;
      story_goal?: string | null;
    } | null;
  },
): string {
  const childLines = children
    .map((child, index) => {
      const imageNumber = index + 1;
      return `Image ${imageNumber}: ${child.name} (age ${child.age}) — the child in this photo. Use Image ${imageNumber} as the only identity source for ${child.name}. Preserve ${child.name}'s exact likeness: face shape, eyes, eyebrows, nose, mouth, skin tone, hair color, hair texture, and distinctive features. Paint ${child.name} as a storybook character who still looks like this child, not a generic cartoon and not a photo collage.`;
    })
    .join("\n");

  const together =
    children.length > 1
      ? `Include every named child together in this scene as consistent painted storybook characters. None of them is left out. Do not mix identities between children.`
      : `The named child is the star of this picture.`;

  const letterNote =
    track.slug === "alphabet"
      ? `If this page is about a letter, you may paint that single large letter as a picture-book prop in the scene — not a computer font, not a caption overlay.`
      : `Do not add titles, captions, speech bubbles, watermarks, or paragraphs of text.`;

  const continuity = extras?.continuity;
  const continuityLines = continuity
    ? [
        continuity.world_description
          ? `The world's look, art style and palette stay the same, but the location within that world, the pose, and the composition change on every page: ${continuity.world_description}`
          : "",
        continuity.clothing ? `Keep clothing consistent: ${continuity.clothing}` : "",
        continuity.recurring_objects && continuity.recurring_objects.length > 0
          ? `Recurring objects may appear (${continuity.recurring_objects.join(", ")}) but keep them small or in the background; never make the same object the focal point on two pages in a row.`
          : "",
        continuity.companion_characters && continuity.companion_characters.length > 0
          ? `Companion characters: ${continuity.companion_characters.join(", ")}`
          : "",
        continuity.story_goal ? `Story goal: ${continuity.story_goal}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const scene = extras?.sceneDescription?.trim();
  const sceneBlock =
    scene && scene !== pageText.trim()
      ? `Scene notes for the illustrator:\n"""\n${scene}\n"""`
      : "";

  const previousSummary =
    pageIndex > 0
      ? extras?.previousPage?.scene?.trim() || extras?.previousPage?.text?.trim() || ""
      : "";
  const previousBlock = previousSummary
    ? `The previous page showed: ${previousSummary}. This page must be a clearly different picture: a new spot within the same world, a new action, a new camera angle, a different pose for each child, and different foreground objects. Do not reuse the previous page's composition, prop arrangement or pose.`
    : "";

  const framing = `Frame every named child from head-and-shoulders or wider so the face is fully visible. Never crop a face out of the picture. If the story says a child wears a mask, goggles, or hat, show it with the face still visible around it — keep the eyes and expression readable.
Compose this page as: ${compositionForPage(pageIndex)}.`;

  return `${ART_STYLE}

This is page ${pageIndex + 1} of ${pageCount} in a personalized picture book.
Theme: ${track.name}. ${track.description}

Reference images (use these identities only):
${childLines}

Keep each child's identity locked to their numbered reference image across this page.
${together}

${framing}
${previousBlock ? `\n${previousBlock}` : ""}

Scene to illustrate, from the story:
"""
${pageText}
"""

${letterNote}
${continuityLines ? `\n${continuityLines}` : ""}
${sceneBlock ? `\n${sceneBlock}` : ""}`;
}

export type IllustrationApiErrorInfo = {
  message: string;
  isAccessError: boolean;
};

function errorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function describeIllustrationApiError(error: unknown): IllustrationApiErrorInfo {
  const status = errorStatus(error);
  const code = errorCode(error);
  const raw = errorMessage(error);
  const isAccessError =
    status === 401 ||
    status === 403 ||
    code === "model_not_found" ||
    /not (have )?access|permission|organization must be verified|insufficient_quota|does not have access to model/i.test(
      raw,
    );

  if (isAccessError) {
    return {
      isAccessError: true,
      message:
        `gpt-image-2 access/permission error (${status ?? "unknown status"}${code ? `, ${code}` : ""}): ${raw}. ` +
        `This model may require OpenAI organization verification or a higher usage tier than gpt-image-1.`,
    };
  }

  return { isAccessError: false, message: raw };
}

export function previewIllustrationCount(pageCount: number): number {
  return Math.min(PREVIEW_ILLUSTRATION_COUNT, Math.max(0, pageCount));
}

export function isPreviewIllustrationPage(index: number): boolean {
  return index >= 0 && index < PREVIEW_ILLUSTRATION_COUNT;
}

export function previewGenerationSucceeded(
  illustrations: (string | null)[],
  pageCount: number,
): boolean {
  const n = previewIllustrationCount(pageCount);
  if (n === 0) return false;
  return illustrations.slice(0, n).every((path) => Boolean(path));
}

export function illustrationSlot(
  index: number,
  hasImage: boolean,
  illustrating: boolean,
): IllustrationSlot {
  if (!isPreviewIllustrationPage(index)) return "none";
  if (hasImage) return "image";
  if (illustrating) return "loading";
  return "none";
}
