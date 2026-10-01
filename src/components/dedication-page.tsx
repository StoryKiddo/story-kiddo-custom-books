/**
 * Optional dedication page inside the book, before story page 1.
 * The note is plain text. Blank notes are not rendered by the caller.
 */

import { StoryPanel } from "@/components/story-panel";
import { withAlpha } from "@/lib/color";
import type { Track } from "@/lib/tracks";

export function DedicationPage({
  track,
  note,
}: {
  track: Pick<Track, "slug" | "art">;
  note: string;
}) {
  const { deep, accent } = track.art;

  return (
    <section className="mt-12">
      <figure
        className="paper-grain relative overflow-hidden rounded-[30px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_22px_38px_-24px_rgba(35,26,19,0.5)]"
        style={{ background: `linear-gradient(180deg, ${withAlpha(accent, 0.22)}, ${withAlpha(accent, 0.1)})` }}
      >
        <div className="relative px-4 py-10 sm:px-8 sm:py-12">
          <StoryPanel track={track}>
            <p
              className="whitespace-pre-line text-center font-story text-[1.16rem] leading-[1.75] sm:text-[1.3rem]"
              style={{ color: deep }}
            >
              {note}
            </p>
          </StoryPanel>
        </div>
      </figure>
    </section>
  );
}
