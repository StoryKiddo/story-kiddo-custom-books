"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  GENERATION_STATUS_POLL_MAX_MS,
  generationStatusPath,
  nextGenerationStatusDelayMs,
  shouldRefreshAfterGenerationStatus,
} from "@/lib/generation-status";

/** Polls a tiny status endpoint until generation finishes, then refreshes once. */
export function RefreshWhileGenerating({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let refreshed = false;
    let timeoutId = 0;
    let delayMs = 0;
    let inflight: AbortController | null = null;
    const startedAt = Date.now();

    const timedOut = () => Date.now() - startedAt >= GENERATION_STATUS_POLL_MAX_MS;

    const clearTimer = () => {
      if (timeoutId !== 0) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }
    };

    const stopInflight = () => {
      inflight?.abort();
      inflight = null;
    };

    const schedule = (ms: number) => {
      clearTimer();
      if (cancelled || refreshed || timedOut()) return;
      timeoutId = window.setTimeout(() => {
        void poll();
      }, ms);
    };

    const poll = async () => {
      if (cancelled || refreshed || timedOut()) return;
      if (document.hidden) return;

      delayMs = nextGenerationStatusDelayMs(delayMs);
      stopInflight();
      const controller = new AbortController();
      inflight = controller;

      try {
        const response = await fetch(generationStatusPath(orderId), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (cancelled || refreshed) return;
        if (response.ok) {
          const payload: unknown = await response.json();
          if (
            payload &&
            typeof payload === "object" &&
            shouldRefreshAfterGenerationStatus(payload)
          ) {
            refreshed = true;
            clearTimer();
            router.refresh();
            return;
          }
        }
      } catch {
        // Keep the page usable. The next scheduled poll uses backoff.
      } finally {
        if (inflight === controller) inflight = null;
      }

      if (cancelled || refreshed || timedOut() || document.hidden) return;
      schedule(delayMs);
    };

    const onVisibility = () => {
      if (cancelled || refreshed) return;
      if (document.hidden) {
        clearTimer();
        return;
      }
      if (inflight || timedOut()) return;
      schedule(delayMs || nextGenerationStatusDelayMs(0));
    };

    document.addEventListener("visibilitychange", onVisibility);
    schedule(nextGenerationStatusDelayMs(0));

    return () => {
      cancelled = true;
      clearTimer();
      stopInflight();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [orderId, router]);

  return null;
}
