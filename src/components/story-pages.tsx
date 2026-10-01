/** Read-aloud story pages on the order confirmation screen.
 *  Before payment we only show the first seven pages (or fewer if the book is shorter).
 *
 *  Each page is one 2:3 picture card. Caption text sits on the artwork over a
 *  soft scrim — never on a separate plate under the image.
 */

import { StoryPanel } from "@/components/story-panel";
import { withAlpha } from "@/lib/color";
import { illustrationSlot } from "@/lib/illustration-prompt";
import { PREVIEW_STORY_PAGE_COUNT } from "@/lib/personalization";
import type { Track } from "@/lib/tracks";

export type StoryPageView = {
  text: string;
  imageUrl?: string | null;
};

type PageTrack = Pick<Track, "slug" | "name" | "art">;

const CARD_SHADOW =
  "0 1px 0 rgba(255,255,255,0.18) inset, 0 22px 38px -24px rgba(35,26,19,0.5)";

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
  return (
    <figure
      className="relative mx-auto w-full max-w-[32rem] overflow-hidden rounded-[30px]"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="relative aspect-[2/3] w-full">
        {imageUrl ? (
          // Signed storage URLs are short-lived and private; a plain img avoids next/image host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Illustration for page ${number}`}
            className="h-full w-full"
          />
        ) : (
          <div className="story-page-wash absolute inset-0" />
        )}
        <PageNumber number={number} />
        {painting ? (
          <p
            className="absolute right-5 top-5 z-10 rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] sm:right-6 sm:top-6"
            style={{
              background: "rgba(40, 28, 20, 0.45)",
              color: "#fff6e6",
            }}
          >
            Painting this picture…
          </p>
        ) : null}
        <StoryPanel track={track}>
          <p
            className="story-caption-text whitespace-pre-line text-center font-story leading-[1.75]"
            style={{
              color: "#fff6e6",
              textShadow: "0 1px 2px rgba(40, 28, 20, 0.65), 0 0 18px rgba(40, 28, 20, 0.35)",
            }}
          >
            {text}
          </p>
        </StoryPanel>
      </div>
    </figure>
  );
}

function PageNumber({ number }: { number: number }) {
  return (
    <span
      className="absolute left-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold sm:left-6 sm:top-6"
      style={{
        background: "rgba(40, 28, 20, 0.45)",
        color: "#fff6e6",
        boxShadow: `0 2px 10px -4px ${withAlpha("#281c14", 0.8)}`,
      }}
    >
      <span aria-hidden="true">{number}</span>
      <span className="sr-only">Page {number}</span>
    </span>
  );
}
