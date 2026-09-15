/**
 * Shared helpers for the order confirmation generation-status poll.
 * This module is safe to import from Client Components: no Supabase client,
 * no service-role key, and no Storage paths.
 */

import type { BookStatus } from "./supabase/types.ts";
import { PREVIEW_STORY_PAGE_COUNT } from "./personalization.ts";

/** The only books columns the status endpoint is allowed to read. */
export const GENERATION_STATUS_SELECT = "status, preview_generated";

export const GENERATION_STATUS_INITIAL_DELAY_MS = 5_000;
export const GENERATION_STATUS_MAX_DELAY_MS = 30_000;
export const GENERATION_STATUS_POLL_MAX_MS = 30 * 60 * 1000;

export type GenerationStatusPayload = {
  status: BookStatus;
  previewGenerated: boolean;
};

export function isTerminalBookStatus(status: BookStatus): boolean {
  return status === "complete" || status === "failed";
}

export function generationStatusPath(orderId: string): string {
  return `/api/orders/${encodeURIComponent(orderId)}/generation-status`;
}

/** 5s → 10s → 20s → 30s, then stay at 30s. */
export function nextGenerationStatusDelayMs(previousDelayMs: number): number {
  if (previousDelayMs < 5_000) return 5_000;
  if (previousDelayMs < 10_000) return 10_000;
  if (previousDelayMs < 20_000) return 20_000;
  return GENERATION_STATUS_MAX_DELAY_MS;
}

export function shouldRefreshAfterGenerationStatus(payload: {
  status?: string | null;
  previewGenerated?: boolean | null;
}): boolean {
  if (payload.previewGenerated === true) return true;
  return payload.status === "complete" || payload.status === "failed";
}

export function isGenerationStatusPollExpired(startedAtMs: number, nowMs: number): boolean {
  return nowMs - startedAtMs >= GENERATION_STATUS_POLL_MAX_MS;
}

function asIllustrationPaths(value: unknown): (string | null)[] | null {
  if (!Array.isArray(value)) return null;
  const paths = value.map((entry) =>
    typeof entry === "string" && entry.trim().length > 0 ? entry : null,
  );
  return paths.some((path) => path) ? paths : null;
}

/** Paths getOrderSummary may sign. Null while generation is still in progress. */
export function illustrationPathsToSign(
  bookStatus: BookStatus,
  illustrations: unknown,
): (string | null)[] | null {
  if (!isTerminalBookStatus(bookStatus)) return null;
  return asIllustrationPaths(illustrations)?.slice(0, PREVIEW_STORY_PAGE_COUNT) ?? null;
}
