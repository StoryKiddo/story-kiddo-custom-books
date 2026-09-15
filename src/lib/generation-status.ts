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

export type GenerationStatusPollDeps = {
  /** Resolves the parsed status payload, or null when the request was not usable. */
  fetchStatus: (signal: AbortSignal) => Promise<unknown>;
  /** Called at most once, when generation is terminal or the preview is ready. */
  onReady: () => void;
  setTimer: (run: () => void, delayMs: number) => number;
  clearTimer: (id: number) => void;
  now?: () => number;
  isHidden?: () => boolean;
};

export type GenerationStatusPollHandle = {
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

/**
 * One self-scheduling timeout, so status requests can never overlap.
 * Timers and fetching are injected to keep this testable without a DOM.
 */
export function startGenerationStatusPoll(
  deps: GenerationStatusPollDeps,
): GenerationStatusPollHandle {
  const now = deps.now ?? (() => Date.now());
  const isHidden = deps.isHidden ?? (() => false);
  const startedAt = now();

  let stopped = false;
  let ready = false;
  let timerId: number | null = null;
  let inflight: AbortController | null = null;
  // Holds the delay already in flight, so the first 5s is not scheduled twice.
  let delayMs = GENERATION_STATUS_INITIAL_DELAY_MS;

  const expired = () => isGenerationStatusPollExpired(startedAt, now());

  const clearTimer = () => {
    if (timerId !== null) {
      deps.clearTimer(timerId);
      timerId = null;
    }
  };

  const abortInflight = () => {
    inflight?.abort();
    inflight = null;
  };

  const schedule = (ms: number) => {
    clearTimer();
    if (stopped || ready || expired()) return;
    timerId = deps.setTimer(() => {
      timerId = null;
      void poll();
    }, ms);
  };

  const poll = async () => {
    if (stopped || ready || expired() || isHidden()) return;

    abortInflight();
    const controller = new AbortController();
    inflight = controller;

    try {
      const payload = await deps.fetchStatus(controller.signal);
      if (stopped || ready) return;
      if (payload && typeof payload === "object" && shouldRefreshAfterGenerationStatus(payload)) {
        ready = true;
        clearTimer();
        deps.onReady();
        return;
      }
    } catch {
      // Keep the page usable. The next scheduled poll uses backoff.
    } finally {
      if (inflight === controller) inflight = null;
    }

    if (stopped || ready || isHidden()) return;
    delayMs = nextGenerationStatusDelayMs(delayMs);
    schedule(delayMs);
  };

  schedule(delayMs);

  return {
    pause: clearTimer,
    resume: () => {
      if (stopped || ready || inflight || timerId !== null) return;
      schedule(delayMs);
    },
    stop: () => {
      stopped = true;
      clearTimer();
      abortInflight();
    },
  };
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
