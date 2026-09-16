"use client";

/**
 * What the preview page shows while a book is being made: the stage the
 * pipeline is actually on, a live elapsed counter, and the only time claim we
 * can stand behind — the limit generation is given.
 *
 * The status poll that reloads the page lives in `RefreshWhileGenerating`;
 * this component only reports.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { withAlpha } from "@/lib/color";
import {
  GENERATION_STAGES,
  formatElapsed,
  generationExpectation,
  generationStage,
  isOverGenerationLimit,
} from "@/lib/generation-progress";
import type { BookStatus } from "@/lib/supabase/types";
import type { Track } from "@/lib/tracks";

export function BookInProgress({
  status,
  track,
  childName,
  startedAtIso,
}: {
  status: BookStatus;
  track: Track;
  childName: string;
  /** When the order was placed, so the counter is real rather than page-local. */
  startedAtIso: string | null;
}) {
  const stage = generationStage(status);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAtIso) return;
    const startedAt = new Date(startedAtIso).getTime();
    if (Number.isNaN(startedAt)) return;

    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [startedAtIso]);

  const overLimit = elapsedMs !== null && isOverGenerationLimit(elapsedMs);
  const { deep, accent } = track.art;

  return (
    <section
      aria-live="polite"
      className="paper-grain relative mt-10 overflow-hidden rounded-[28px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_20px_34px_-26px_rgba(35,26,19,0.5)]"
      style={{ background: `linear-gradient(160deg, ${withAlpha(accent, 0.28)}, ${withAlpha(accent, 0.1)})` }}
    >
      <div className="relative grid gap-6 p-6 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8">
        <Image
          src="/brand/hero/book-press.png"
          alt=""
          width={1200}
          height={900}
          sizes="(min-width: 640px) 15rem, 80vw"
          className="h-auto w-full rounded-2xl"
        />

        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em]" style={{ color: deep }}>
            {overLimit ? "Taking longer than it should" : "Being made now"}
          </p>
          <h2 className="mt-2 text-2xl leading-tight text-ink sm:text-[1.75rem]">
            {`We're making ${childName}'s book`}
          </h2>
          <p className="mt-2 text-ink-soft">{stage.note}</p>

          <ol className="mt-5 space-y-2.5">
            {GENERATION_STAGES.map((item, index) => {
              const state = index < stage.index ? "done" : index === stage.index ? "active" : "waiting";
              return (
                <li key={item.key} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                      state === "active" ? "ink-pulse" : ""
                    }`}
                    style={{
                      background: state === "waiting" ? withAlpha(deep, 0.12) : deep,
                      color: state === "waiting" ? withAlpha(deep, 0.7) : "#fffaf3",
                    }}
                  >
                    {state === "done" ? "✓" : index + 1}
                  </span>
                  <span
                    className={state === "waiting" ? "text-ink-soft" : "font-semibold text-ink"}
                  >
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div
            className="mt-6 h-2 w-full overflow-hidden rounded-full"
            style={{ background: withAlpha(deep, 0.16) }}
          >
            <div
              className="press-sweep h-full w-1/3 rounded-full"
              style={{ background: deep }}
            />
          </div>

          <p className="mt-4 text-sm text-ink-soft">
            {elapsedMs === null
              ? generationExpectation()
              : overLimit
                ? `This has been going for ${formatElapsed(
                    elapsedMs,
                  )}, which is past the limit we give it. Refresh in a moment — if it still isn't here, the story below is saved and we can pick it up again.`
                : `Working for ${formatElapsed(elapsedMs)}. ${generationExpectation()}`}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            This page updates itself — you don&apos;t need to reload it.
          </p>
        </div>
      </div>
    </section>
  );
}
