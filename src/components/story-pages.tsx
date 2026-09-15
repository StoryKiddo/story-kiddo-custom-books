/** Read-aloud story pages on the order confirmation screen.
 *  Before payment we only show the first seven pages (or fewer if the book is shorter).
 *
 *  Each page is set like a real picture-book spread: the illustration fills the
 *  page and the words sit on it, over a soft wash of the theme's own color.
 *  Pages without art yet get a painted paper panel in the same palette.
 */

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
        <h2 className="font-cover text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Your story
        </h2>
        <p className="text-sm text-ink-soft">
          A preview of the first pages. The rest of the book stays unseen until later.
        </p>
      </div>
      {illustrating ? (
        <p className="rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          A couple of preview pictures are being painted&hellip;
        </p>
      ) : null}
      <ol className="space-y-7">
        {pages.slice(0, PREVIEW_STORY_PAGE_COUNT).map((page, index) => {
          const slot = illustrationSlot(index, Boolean(page.imageUrl), illustrating);
          return (
            <li key={index}>
              {slot === "image" ? (
                <IllustratedPage track={track} number={index + 1} page={page} />
              ) : (
                <PaperPage
                  track={track}
                  number={index + 1}
                  text={page.text}
                  painting={slot === "loading"}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Words over the art, on a wash of the theme color that fades up into the scene. */
function IllustratedPage({
  track,
  number,
  page,
}: {
  track: PageTrack;
  number: number;
  page: StoryPageView;
}) {
  const { deep } = track.art;
  return (
    <figure
      className="relative overflow-hidden rounded-[28px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_18px_34px_-22px_rgba(36,28,22,0.5)]"
      style={{ background: track.art.skyBottom }}
    >
      {/* Signed storage URLs are short-lived and private; a plain img avoids next/image host config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.imageUrl ?? ""}
        alt={`Illustration for page ${number}`}
        className="aspect-[4/5] w-full object-cover sm:aspect-[4/3]"
      />
      <PageNumber number={number} deep={deep} />
      <figcaption className="absolute inset-x-0 bottom-0">
        <div
          className="px-6 pb-8 pt-24 backdrop-blur-[6px] sm:px-10 sm:pb-9 sm:pt-28"
          style={{
            // Holds ~0.9 opacity everywhere the words sit, then fades out well
            // above them so the wash blends into the picture instead of ending.
            backgroundImage: `linear-gradient(0deg, ${withAlpha(deep, 0.92)} 0%, ${withAlpha(
              deep,
              0.9,
            )} 66%, ${withAlpha(deep, 0.42)} 86%, ${withAlpha(deep, 0)} 100%)`,
            maskImage: "linear-gradient(0deg, #000 0%, #000 72%, rgba(0,0,0,0.55) 90%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(0deg, #000 0%, #000 72%, rgba(0,0,0,0.55) 90%, transparent 100%)",
          }}
        >
          <p className="story-type-shadow mx-auto max-w-[34rem] whitespace-pre-line text-center font-story text-[1.16rem] font-medium leading-[1.75] text-[#fffaf4] sm:text-[1.3rem]">
            {page.text}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

/** A painted paper page for text that has no illustration yet. */
function PaperPage({
  track,
  number,
  text,
  painting,
}: {
  track: PageTrack;
  number: number;
  text: string;
  painting: boolean;
}) {
  const { deep, accent } = track.art;
  return (
    <figure
      className="relative flex aspect-[5/6] items-center justify-center overflow-hidden rounded-[28px] border border-ink/10 px-5 py-10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_34px_-24px_rgba(36,28,22,0.45)] sm:aspect-[3/2] sm:px-10 sm:py-12"
    >
      <div className="absolute inset-0">
        <ThemeArt track={track} />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: withAlpha("#fffaf4", 0.16) }}
      />
      <PageNumber number={number} deep={deep} />

      {/* Words on a tipped-in paper panel, the way many picture books set type. */}
      <div
        className="paper-grain relative w-full max-w-[38rem] rounded-[22px] px-6 py-8 backdrop-blur-[2px] sm:px-10 sm:py-10"
        style={{
          background: withAlpha("#fffaf4", 0.9),
          boxShadow: `0 1px 0 ${withAlpha("#ffffff", 0.8)} inset, 0 0 0 1px ${withAlpha(
            accent,
            0.45,
          )}, 0 18px 30px -22px ${withAlpha(deep, 0.9)}`,
        }}
      >
        <p
          className="whitespace-pre-line text-center font-story text-[1.16rem] font-medium leading-[1.75] sm:text-[1.3rem]"
          style={{ color: deep }}
        >
          {text}
        </p>
        {painting ? (
          <p
            className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: withAlpha(deep, 0.7) }}
          >
            Painting this picture&hellip;
          </p>
        ) : null}
      </div>
    </figure>
  );
}

function PageNumber({ number, deep }: { number: number; deep: string }) {
  return (
    <span
      className="absolute left-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full font-cover text-sm font-bold sm:left-6 sm:top-6"
      style={{
        background: withAlpha("#fffaf4", 0.92),
        color: deep,
        boxShadow: `0 2px 10px -4px ${withAlpha(deep, 0.8)}`,
      }}
    >
      <span aria-hidden="true">{number}</span>
      <span className="sr-only">Page {number}</span>
    </span>
  );
}
