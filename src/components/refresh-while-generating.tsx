"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  generationStatusPath,
  generationTickPath,
  startGenerationStatusPoll,
} from "@/lib/generation-status";

/**
 * Polls a read-only status endpoint. When a step is claimable, POSTs a tick
 * with the per-order resume token. GET never starts a model call.
 */
export function RefreshWhileGenerating({
  orderId,
  resumeToken,
}: {
  orderId: string;
  resumeToken: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const poll = startGenerationStatusPoll({
      fetchStatus: async (signal) => {
        const response = await fetch(generationStatusPath(orderId), {
          cache: "no-store",
          signal,
        });
        const payload = response.ok ? await response.json() : null;
        if (
          payload &&
          typeof payload === "object" &&
          "needsTick" in payload &&
          payload.needsTick === true &&
          resumeToken
        ) {
          await fetch(generationTickPath(orderId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeToken }),
            signal,
          });
          const again = await fetch(generationStatusPath(orderId), {
            cache: "no-store",
            signal,
          });
          return again.ok ? await again.json() : payload;
        }
        return payload;
      },
      onProgress: () => router.refresh(),
      onReady: () => router.refresh(),
      setTimer: (run, delayMs) => window.setTimeout(run, delayMs),
      clearTimer: (id) => window.clearTimeout(id),
      isHidden: () => document.hidden,
    });

    const onVisibility = () => {
      if (document.hidden) {
        poll.pause();
      } else {
        poll.resume();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      poll.stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [orderId, resumeToken, router]);

  return null;
}
