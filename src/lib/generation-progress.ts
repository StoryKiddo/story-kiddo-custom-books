/**
 * What to tell someone while their book is being made.
 *
 * The stages mirror what the pipeline actually does, in order: Claude writes
 * the pages, then gpt-image-2 letters the cover, then it paints the first
 * preview pages. Nothing here invents a delivery estimate — the only number we
 * quote is the time limit the generation step is actually given.
 */

import type { BookStatus } from "./supabase/types.ts";

/**
 * The ceiling the create route gives generation (`export const maxDuration`).
 * Quoting this is honest in a way that a made-up "usually 90 seconds" is not.
 */
export const GENERATION_LIMIT_SECONDS = 300;

export type GenerationStage = {
  /** 0-based position in `GENERATION_STAGES`. */
  index: number;
  label: string;
  /** One line of plain copy about what is happening right now. */
  note: string;
  done: boolean;
  failed: boolean;
};

export const GENERATION_STAGES = [
  { key: "story", label: "Writing the story" },
  { key: "cover", label: "Lettering the cover" },
  { key: "pages", label: "Painting the first pages" },
] as const;

export function generationStage(status: BookStatus): GenerationStage {
  switch (status) {
    case "pending":
    case "generating":
      return {
        index: 0,
        label: GENERATION_STAGES[0].label,
        note: "We're writing the pages around the details you gave us.",
        done: false,
        failed: false,
      };
    case "illustrating":
      return {
        index: 1,
        label: GENERATION_STAGES[1].label,
        note: "The title and your child's name are being painted into the cover art.",
        done: false,
        failed: false,
      };
    case "complete":
      return {
        index: GENERATION_STAGES.length,
        label: "Ready",
        note: "Your preview is ready.",
        done: true,
        failed: false,
      };
    case "failed":
    default:
      return {
        index: GENERATION_STAGES.length,
        label: "Needs another go",
        note: "Something went wrong while we were making this one.",
        done: true,
        failed: true,
      };
  }
}

/** "45 seconds" / "2 minutes 5 seconds", for a live elapsed counter. */
export function formatElapsed(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const secondLabel = `${seconds} second${seconds === 1 ? "" : "s"}`;
  if (minutes === 0) return secondLabel;
  const minuteLabel = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return seconds === 0 ? minuteLabel : `${minuteLabel} ${secondLabel}`;
}

/** The one time claim on the page, tied to the limit the pipeline really has. */
export function generationExpectation(): string {
  return `Generation is given up to ${Math.round(
    GENERATION_LIMIT_SECONDS / 60,
  )} minutes. If it runs past that we stop and tell you instead of leaving you here.`;
}

/** True once we are past the limit and should stop implying it is still coming. */
export function isOverGenerationLimit(elapsedMs: number): boolean {
  return elapsedMs > GENERATION_LIMIT_SECONDS * 1000;
}
