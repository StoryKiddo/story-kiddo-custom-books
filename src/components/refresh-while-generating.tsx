"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { generationStatusPath, startGenerationStatusPoll } from "@/lib/generation-status";

/** Polls a tiny status endpoint until generation finishes, then refreshes once. */
export function RefreshWhileGenerating({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const poll = startGenerationStatusPoll({
      fetchStatus: async (signal) => {
        const response = await fetch(generationStatusPath(orderId), {
          cache: "no-store",
          signal,
        });
        return response.ok ? await response.json() : null;
      },
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
  }, [orderId, router]);

  return null;
}
