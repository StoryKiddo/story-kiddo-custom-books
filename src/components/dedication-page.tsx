/**
 * Optional dedication page inside the book, before story page 1.
 * The note is plain text. Blank notes are not rendered by the caller.
 */

import type { Track } from "@/lib/tracks";

export function DedicationPage({
  track,
  note,
}: {
  track: Pick<Track, "slug" | "art">;
  note: string;
}) {
  const { deep } = track.art;

  return (
    <section className="mt-12">
      <figure
        className="relative mx-auto w-full max-w-[32rem] overflow-hidden rounded-[30px]"
        style={{
          boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 22px 38px -24px rgba(35,26,19,0.5)",
        }}
      >
        <div className="story-page-wash relative flex aspect-[2/3] w-full items-center justify-center px-8 py-10 sm:px-10">
          <p
            className="whitespace-pre-line text-center font-story text-[1.16rem] leading-[1.75] sm:text-[1.3rem]"
            style={{ color: deep }}
          >
            {note}
          </p>
        </div>
      </figure>
    </section>
  );
}
