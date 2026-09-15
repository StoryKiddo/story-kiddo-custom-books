/**
 * A finished picture-book cover: illustration full-bleed, title typeset on top
 * of it the way a published storybook sets one — hand-drawn serif, generous
 * size, sitting in the sky above the scene, with a soft scrim for contrast.
 *
 * Used for the order preview (with the signed preview illustration) and for
 * the example covers in the homepage hero (with the theme scene).
 */

import { BrandMark } from "@/components/brand-mark";
import { ThemeArt } from "@/components/theme-art";
import { withAlpha } from "@/lib/color";
import type { Track } from "@/lib/tracks";

type CoverTrack = Pick<Track, "slug" | "name" | "ink" | "art">;

export function StoryBookCover({
  track,
  title,
  subtitle = null,
  byline = null,
  imageUrl = null,
  className = "",
}: {
  track: CoverTrack;
  title: string;
  subtitle?: string | null;
  /** Small line above the imprint, e.g. "Starring Dylan, age 4". */
  byline?: string | null;
  imageUrl?: string | null;
  className?: string;
}) {
  const { deep, accent } = track.art;
  // Long titles step down a size so three words never crowd the sky.
  const titleSize = title.length > 30 ? "9.5cqw" : title.length > 20 ? "11cqw" : "13cqw";

  return (
    // The outer element only establishes the container, so every measurement
    // inside the cover can be written in `cqw` and scale with the cover.
    <div className={className} style={{ containerType: "inline-size" }}>
      <div
        className="cover-plate relative aspect-[2/3] overflow-hidden rounded-[3.5cqw]"
        style={{ background: track.art.skyBottom }}
      >
        <div className="absolute inset-0">
          {imageUrl ? (
            // Signed storage URLs are short-lived and private; a plain img avoids next/image host config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`Cover illustration for ${title}`}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <ThemeArt track={track} portrait />
          )}
        </div>

        {/* Sky scrim: dense enough to carry the title, gone by the middle of the art. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[56%]"
          style={{
            backgroundImage: `linear-gradient(180deg, ${withAlpha(deep, 0.9)} 0%, ${withAlpha(
              deep,
              0.78,
            )} 46%, ${withAlpha(deep, 0.34)} 76%, ${withAlpha(deep, 0)} 100%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[30%]"
          style={{
            backgroundImage: `linear-gradient(0deg, ${withAlpha(deep, 0.8)} 0%, ${withAlpha(
              deep,
              0.38,
            )} 48%, ${withAlpha(deep, 0)} 100%)`,
          }}
        />

        {/* Spine and board-book edge. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[4cqw]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${withAlpha(deep, 0.95)} 0%, ${withAlpha(
              deep,
              0.65,
            )} 55%, ${withAlpha(deep, 0.1)} 100%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[3.5cqw]"
          style={{ boxShadow: `inset 0 0 0 0.6cqw ${withAlpha("#fffaf4", 0.5)}` }}
        />

        <div className="relative flex h-full flex-col justify-between px-[8cqw] pb-[6cqw] pt-[7cqw] text-center">
          <div>
            <h3
              className="cover-type font-cover font-bold leading-[0.95] tracking-[-0.01em] text-[#fffaf4]"
              style={{ fontSize: titleSize }}
            >
              {title}
            </h3>
            <div
              className="mt-[4cqw] flex items-center justify-center gap-[2.5cqw]"
              aria-hidden="true"
            >
              <span className="h-px w-[14cqw]" style={{ background: withAlpha("#fffaf4", 0.55) }} />
              <svg viewBox="0 0 24 24" className="h-[4cqw] w-[4cqw]" fill={accent}>
                <path d="M12 1.6l2.9 6.2 6.7.9-4.9 4.7 1.3 6.7L12 16.8 5.9 20.1l1.3-6.7L2.4 8.7l6.7-.9L12 1.6Z" />
              </svg>
              <span className="h-px w-[14cqw]" style={{ background: withAlpha("#fffaf4", 0.55) }} />
            </div>
            {subtitle ? (
              <p
                className="cover-type mt-[3.5cqw] font-cover text-[5cqw] leading-snug"
                style={{ color: withAlpha("#fffaf4", 0.94) }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="space-y-[2.5cqw]">
            {byline ? (
              <p
                className="cover-type font-cover text-[4.2cqw] leading-snug"
                style={{ color: withAlpha("#fffaf4", 0.95) }}
              >
                {byline}
              </p>
            ) : null}
            <p
              className="flex items-center justify-center gap-[2cqw] text-[3cqw] font-semibold uppercase tracking-[0.2em]"
              style={{ color: withAlpha("#fffaf4", 0.9) }}
            >
              <BrandMark className="h-[4.5cqw] w-[4.5cqw]" />
              Story Kiddo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
