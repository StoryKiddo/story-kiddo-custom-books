/**
 * Portrait children's-book cover for the order preview.
 * Uses the first existing signed preview illustration when available;
 * otherwise a complete TrackIcon fallback. Does not generate or sign images.
 */

import { BrandMark } from "@/components/brand-mark";
import { TrackIcon } from "@/components/track-icon";
import type { Track } from "@/lib/tracks";

export function BookCoverPreview({
  title,
  subtitle,
  track,
  imageUrl,
}: {
  title: string;
  subtitle: string | null;
  track: Track;
  imageUrl: string | null;
}) {
  return (
    <figure className="mx-auto mt-10 w-full max-w-[20.5rem] sm:max-w-[22.5rem]">
      <div
        className="relative flex aspect-[2/3] flex-col overflow-hidden rounded-[22px] border-2 border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_18px_32px_-14px_rgba(36,28,22,0.28)]"
        style={{ background: track.cover }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2.5 sm:w-3"
          style={{ background: track.ink }}
        />
        <div className="flex min-h-0 flex-1 flex-col pl-4 pr-3 pt-4 sm:pl-5 sm:pr-4 sm:pt-5">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] bg-white/45">
            {imageUrl ? (
              // Signed storage URLs are short-lived and private; a plain img avoids next/image host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={`Cover of ${title}`}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div
                className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 py-8 sm:min-h-[14rem]"
                style={{ color: track.ink }}
              >
                <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/70 sm:h-28 sm:w-28">
                  <span className="origin-center scale-[1.65]">
                    <TrackIcon slug={track.slug} ink={track.ink} />
                  </span>
                </span>
                <p className="text-center text-sm font-semibold" style={{ color: track.ink }}>
                  {track.name}
                </p>
              </div>
            )}
          </div>
          <figcaption className="mt-3 mb-1 rounded-[16px] bg-cream/92 px-3.5 py-3 sm:mt-4 sm:px-4 sm:py-3.5">
            <p className="font-display text-xl leading-tight tracking-[-0.02em] text-ink sm:text-2xl">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-1 text-sm leading-snug text-ink-soft">{subtitle}</p>
            ) : null}
            <p className="mt-2.5 flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              <BrandMark className="h-5 w-5" />
              Story Kiddo
            </p>
          </figcaption>
        </div>
      </div>
    </figure>
  );
}
