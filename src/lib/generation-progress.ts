/**
 * What to tell someone while their book is being made.
 *
 * The stages mirror what the pipeline actually does, in order: Claude writes
 * the pages, then gpt-image-2 paints the first preview pages, then it letters
 * the cover. Copy distinguishes working, stalled, retryable, and failed.
 * There is no guaranteed stop-the-clock timeout to quote.
 */

import type { BookStatus } from "./supabase/types.ts";
import { COVER_CUSTOMER_RETRY_MESSAGE } from "./cover-prompt.ts";
import type { GenerationPhase } from "./generation-steps.ts";

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
  { key: "pages", label: "Painting the first pages" },
  { key: "cover", label: "Lettering the cover" },
] as const;

export function generationStage(
  status: BookStatus,
  phase: GenerationPhase | null = null,
): GenerationStage {
  if (phase === "failed" || status === "failed") {
    return {
      index: GENERATION_STAGES.length,
      label: "Needs another go",
      note: COVER_CUSTOMER_RETRY_MESSAGE,
      done: true,
      failed: true,
    };
  }
  if (phase === "complete" || status === "complete") {
    return {
      index: GENERATION_STAGES.length,
      label: "Ready",
      note: "Your preview is ready.",
      done: true,
      failed: false,
    };
  }
  if (status === "pending" || status === "generating") {
    return {
      index: 0,
      label: GENERATION_STAGES[0].label,
      note:
        phase === "stalled"
          ? "Writing stalled before it finished. The details you gave us are saved — we'll pick this step up again."
          : "We're writing the pages around the details you gave us.",
      done: false,
      failed: false,
    };
  }
  return {
    index: phase === "retryable" ? 1 : 1,
    label: GENERATION_STAGES[1].label,
    note:
      phase === "held"
        ? "A picture step paused for review. Saved pages stay saved — it will not keep spending image calls on its own."
        : phase === "stalled"
        ? "A picture step stalled before it finished. Anything already saved stays saved — we'll continue from there."
        : phase === "retryable"
          ? "One picture step hit a problem. We can try that step again without starting the story over."
          : "The first pages are being painted. Each picture appears here as soon as it is saved.",
    done: false,
    failed: false,
  };
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

export function generationExpectation(phase: GenerationPhase | null = null): string {
  switch (phase) {
    case "stalled":
      return "This step stalled before it finished. The story that is already saved stays saved — this page will pick up the next picture from where it stopped.";
    case "retryable":
      return "One picture step hit a problem. We can try that step again without starting over.";
    case "held":
      return "This picture step paused so we can check it before spending another image call. The story that is already saved stays saved.";
    case "failed":
      return COVER_CUSTOMER_RETRY_MESSAGE;
    case "complete":
      return "Your preview is ready.";
    default:
      return "Each picture is saved as soon as it is ready. This page updates itself.";
  }
}

/** True once the wait has gone on long enough that we should say so. Not a kill switch. */
export function isOverGenerationLimit(elapsedMs: number): boolean {
  return elapsedMs > 10 * 60 * 1000;
}

export { COVER_CUSTOMER_RETRY_MESSAGE };
