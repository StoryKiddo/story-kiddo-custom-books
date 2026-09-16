/**
 * Prompt + proofing helpers for the book cover.
 *
 * The cover is the one picture whose lettering matters: the title and the
 * child's name are painted into the artwork, never typeset over it in HTML.
 * Because an image model can misspell, every cover it returns is proofread —
 * the text in the picture is read back and checked against the names we asked
 * for, and a cover that fails is painted again.
 *
 * Kept free of `server-only` so tests can cover the prompt and the proofing
 * rules without a network.
 */

import type { CoverLockup } from "./book-title.ts";
import { ART_STYLE, type IllustrationChild } from "./illustration-prompt.ts";
import type { Track } from "./tracks.ts";

export const COVER_SIZE = "1024x1024" as const;
export const COVER_QUALITY = "high" as const;

/**
 * The model that reads the finished cover back to us so the lettering can be
 * checked. Overridable because proofing and painting move independently.
 */
export const COVER_PROOF_MODEL = process.env.COVER_PROOF_MODEL?.trim() || "gpt-4.1-mini";

export type CoverImageRequestFields = {
  model: "gpt-image-2";
  prompt: string;
  size: typeof COVER_SIZE;
  quality: typeof COVER_QUALITY;
  output_format: "png";
  n: 1;
};

/** Fields for client.images.edit besides the reference photos. */
export function buildCoverRequestFields(prompt: string): CoverImageRequestFields {
  return {
    model: "gpt-image-2",
    prompt,
    size: COVER_SIZE,
    quality: COVER_QUALITY,
    output_format: "png",
    n: 1,
  };
}

/** One first attempt plus two repaints. */
export const MAX_COVER_ATTEMPTS = 3;

export function coverObjectPath(bookId: string): string {
  return `${bookId}/cover/cover.png`;
}

/** How each theme's title lettering should be painted. */
const LETTERING_STYLE: Record<string, string> = {
  alphabet:
    "chunky rounded storybook capitals with a soft cream outline, like painted wooden alphabet blocks",
  numbers:
    "bouncy circus-poster lettering with a cream outline and a thin gold keyline, like a fairground banner",
  "colors-shapes":
    "playful rounded lettering filled with soft colour, each word outlined in cream like cut paper",
  emotions:
    "soft brushed storybook lettering with gently rounded ends and a cream outline, like hand-painted cloud writing",
  "kindness-values":
    "warm hand-lettered serif with small flourishes and a cream outline, like a lantern-lit sign",
  "life-milestones":
    "sturdy hand-painted serif with a cream outline, like lettering on a garden gate",
  "animals-nature":
    "carved woodland lettering with a cream outline and small leaf flourishes, like a forest signpost",
  manners: "neat rounded storybook lettering with a cream outline and small curls, like a tea-party card",
};

export function letteringStyleFor(track: Pick<Track, "slug">): string {
  return (
    LETTERING_STYLE[track.slug] ??
    "big playful storybook lettering with a soft cream outline so it reads over the picture"
  );
}

export type CoverPromptOptions = {
  track: Track;
  children: IllustrationChild[];
  lockup: CoverLockup;
  /** "From Mom and Dad" — painted small at the foot of the cover. */
  dedication: string;
};

export function buildCoverPrompt(options: CoverPromptOptions): string {
  const { track, children, lockup, dedication } = options;

  const childLines = children
    .map((child, index) => {
      const imageNumber = index + 1;
      return `Image ${imageNumber}: ${child.name} (age ${child.age}) — the child in this photo. Use Image ${imageNumber} as the only identity source for ${child.name}. Keep ${child.name}'s face, hair, and skin tone recognisable.`;
    })
    .join("\n");

  const titleLines = [
    lockup.lead ? `Line 1, the largest: ${lockup.lead}` : null,
    lockup.connector ? `Line 2, much smaller, centred: ${lockup.connector}` : null,
    `Line ${lockup.lead ? (lockup.connector ? 3 : 2) : 1}, large: ${lockup.rest}`,
  ]
    .filter(Boolean)
    .join("\n");

  const spellings = children
    .map((child) => `${child.name} is spelled ${child.name.toUpperCase().split("").join("-")}`)
    .join(". ");

  return `${ART_STYLE}

This is the front cover of a personalized picture book. Square format.
Theme: ${track.name}. ${track.description}

Reference images (use these identities only):
${childLines}

Compose it like a published picture-book cover: the named child standing near the centre of a rich ${track.name.toLowerCase()} scene, friendly invented companions beside them, the top third of the picture left open enough for the title.

The title is part of the painting. Letter it into the artwork itself, in ${letteringStyleFor(track)}. Do not render it as a flat computer font pasted on top.

Title, set on these lines exactly, centred in the upper part of the cover:
${titleLines}

Spelling is critical. Copy the words exactly as given, letter for letter. ${spellings}. No extra words, no invented words, no repeated lines.

At the foot of the cover, paint a small ribbon or banner carrying only this line, in much smaller lettering: "${dedication}".

No other text anywhere: no author line, no publisher, no page numbers, no watermark, no speech bubbles.`;
}

/** Folds case, accents, and punctuation so a read-back can be compared fairly. */
export function normalizeForProof(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type CoverProofInput = {
  /** The text an image-reading model says it can see on the cover. */
  readText: string;
  childNames: string[];
  lockup: CoverLockup;
};

/**
 * Problems worth repainting for. Only the parts a parent would notice as
 * wrong: a missing or misspelled name, or a missing title line.
 */
export function coverProofIssues(input: CoverProofInput): string[] {
  const seen = normalizeForProof(input.readText);
  if (seen.length === 0) {
    return ["No text could be read on the cover."];
  }

  const issues: string[] = [];
  for (const name of input.childNames) {
    const target = normalizeForProof(name);
    if (!target) continue;
    // Whole-word match: "Mia" must not be satisfied by "Miable".
    const pattern = new RegExp(`(^| )${escapeRegExp(target)}( |$)`);
    if (!pattern.test(seen)) {
      issues.push(`"${name}" is not spelled correctly on the cover.`);
    }
  }

  const rest = normalizeForProof(input.lockup.rest);
  if (rest && !seen.includes(rest)) {
    issues.push(`The title line "${input.lockup.rest}" is missing from the cover.`);
  }

  return issues;
}

export function coverPassesProof(input: CoverProofInput): boolean {
  return coverProofIssues(input).length === 0;
}

export function shouldRepaintCover(attempt: number, issues: string[]): boolean {
  return issues.length > 0 && attempt < MAX_COVER_ATTEMPTS;
}

/** Extra instruction added to the prompt when a repaint is needed. */
export function repaintNote(issues: string[]): string {
  return `\n\nThe previous attempt got the lettering wrong: ${issues.join(
    " ",
  )} Paint the cover again and spell every word exactly as written above.`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
