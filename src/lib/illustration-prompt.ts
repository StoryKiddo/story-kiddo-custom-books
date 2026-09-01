/**
 * Prompt + request helpers for page illustrations.
 * Kept free of server-only so tests can cover the gpt-image-2 call shape.
 */

import type { Track } from "./tracks";

export const ILLUSTRATION_MODEL = "gpt-image-2" as const;
export const ILLUSTRATION_SIZE = "1024x1536" as const;
export const ILLUSTRATION_QUALITY = "medium" as const;
export const ILLUSTRATION_OUTPUT_FORMAT = "png" as const;

export const ART_STYLE = `3D animated children's-book illustration, like a high-quality computer-animated film still.
Rounded, appealing character design; soft cinematic lighting; rich, friendly colors; gentle materials and rounded forms.
Not a photograph, not photorealistic live-action, and not a flat 2D drawing.`;

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

export function buildIllustrationPrompt(
  track: Track,
  children: IllustrationChild[],
  pageText: string,
  pageIndex: number,
  pageCount: number,
): string {
  const childLines = children
    .map((child, index) => {
      const imageNumber = index + 1;
      return `Image ${imageNumber}: ${child.name} (age ${child.age}) — the child in this photo. Use Image ${imageNumber} as the only identity source for ${child.name}. Preserve ${child.name}'s exact likeness: face shape, eyes, eyebrows, nose, mouth, skin tone, hair color, hair texture, and distinctive features. Draw ${child.name} as a 3D animated character who still looks like this child, not a generic cartoon and not a photo collage.`;
    })
    .join("\n");

  const together =
    children.length > 1
      ? `Include every named child together in this scene as consistent 3D animated characters. None of them is left out. Do not mix identities between children.`
      : `The named child is the star of this picture.`;

  const letterNote =
    track.slug === "alphabet"
      ? `If this page is about a letter, you may paint that single large letter as a 3D picture-book prop in the scene — not a computer font, not a caption overlay.`
      : `Do not add titles, captions, speech bubbles, watermarks, or paragraphs of text.`;

  return `${ART_STYLE}

This is page ${pageIndex + 1} of ${pageCount} in a personalized picture book.
Theme: ${track.name}. ${track.description}

Reference images (use these identities only):
${childLines}

Keep each child's identity locked to their numbered reference image across this page.
${together}

Scene to illustrate, from the story:
"""
${pageText}
"""

${letterNote}`;
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
