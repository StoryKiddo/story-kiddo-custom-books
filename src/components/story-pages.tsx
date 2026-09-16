/** Read-aloud story pages on the order confirmation screen.
 *  Before payment we only show the first seven pages (or fewer if the book is shorter).
 *
 *  Each page is laid out like a real picture-book page: the illustration on
 *  top, and the words set inside a panel that belongs to that theme's world —
 *  a parchment scroll, a cloud, a painted sign — tipped in over the join.
 */

import { StoryPanel } from "@/components/story-panel";
import { ThemeArt } from "@/components/theme-art";
import { withAlpha } from "@/lib/color";
import { illustrationSlot } from "@/lib/illustration-prompt";
import { PREVIEW_STORY_PAGE_COUNT } from "@/lib/personalization";
import type { Track } from "@/lib/tracks";

export type StoryPageView = {
  text: string;
  imageUrl?: string | null;
};

type PageTrack = Pick<Track, "slug" | "name" | "art">;

export function StoryPages({
  pages,
  track,
  illustrating = false,
}: {
  pages: StoryPageView[];
  track: PageTrack;
  illustrating?: boolean;
}) {
  return (
    <section className="mt-12 space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl tracking-tight text-ink sm:text-3xl">Your story</h2>
        <p className="text-sm text-ink-soft">
          A preview of the first pages. The rest of the book stays unseen until later.
        </p>
      </div>
      <ol className="space-y-8">
        {pages.slice(0, PREVIEW_STORY_PAGE_COUNT).map((page, index) => {
          const slot = illustrationSlot(index, Boolean(page.imageUrl), illustrating);
          return (
            <li key={index}>
              <StoryPage
                track={track}
                number={index + 1}
                text={page.text}
                imageUrl={slot === "image" ? page.imageUrl ?? null : null}
                painting={slot === "loading"}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StoryPage({
  track,
  number,
  text,
  imageUrl,
  painting,
}: {
  track: PageTrack;
  number: number;
  text: string;
  imageUrl: string | null;
  painting: boolean;
}) {
  const { deep, accent } = track.art;

  return (
    <figure
      className="paper-grain relative overflow-hidden rounded-[30px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_22px_38px_-24px_rgba(35,26,19,0.5)]"
      style={{ background: `linear-gradient(180deg, ${withAlpha(accent, 0.22)}, ${withAlpha(accent, 0.1)})` }}
    >
      <div className="relative">
        {imageUrl ? (
          // Signed storage URLs are short-lived and private; a plain img avoids next/image host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Illustration for page ${number}`}
            className="aspect-[4/5] w-full object-cover sm:aspect-[16/10]"
          />
        ) : (
          <div className="aspect-[4/5] w-full sm:aspect-[16/10]">
            <ThemeArt track={track} instance={`page-${number}`} />
          </div>
        )}
        <PageNumber number={number} deep={deep} />
        {painting ? (
          <p
            className="absolute bottom-4 right-4 rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
            style={{ background: withAlpha("#fffaf3", 0.9), color: deep }}
          >
            Painting this picture…
          </p>
        ) : null}
      </div>

      <div className="relative -mt-14 px-4 pb-8 sm:-mt-16 sm:px-8 sm:pb-10">
        <StoryPanel track={track}>
          <p
            className="whitespace-pre-line text-center font-story text-[1.16rem] leading-[1.75] sm:text-[1.3rem]"
            style={{ color: deep }}
          >
            {text}
          </p>
        </StoryPanel>
      </div>
    </figure>
  );
}

function PageNumber({ number, deep }: { number: number; deep: string }) {
  return (
    <span
      className="absolute left-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold sm:left-6 sm:top-6"
      style={{
        background: withAlpha("#fffaf3", 0.92),
        color: deep,
        boxShadow: `0 2px 10px -4px ${withAlpha(deep, 0.8)}`,
      }}
    >
      <span aria-hidden="true">{number}</span>
      <span className="sr-only">Page {number}</span>
    </span>
  );
}
