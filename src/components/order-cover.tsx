/**
 * The cover on the order page.
 *
 * The title is lettered into the cover art by the image pipeline, so nothing
 * is typeset over the picture here. Until that art exists, the plate shows an
 * honest in-progress or failed state — never a stand-in example cover.
 */

import { withAlpha } from "@/lib/color";
import type { Track } from "@/lib/tracks";

export function OrderCover({
  track,
  title,
  coverUrl,
  pending,
  failed = false,
}: {
  track: Track;
  title: string;
  coverUrl: string | null;
  /** True while the cover art is still being generated. */
  pending: boolean;
  failed?: boolean;
}) {
  const { deep } = track.art;

  return (
    <figure className="mx-auto w-full max-w-[22rem] sm:max-w-[24rem]">
      <div
        className="relative aspect-square overflow-hidden rounded-[18px]"
        style={{
          boxShadow: `0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 2px -1px ${withAlpha(
            deep,
            0.25,
          )}, 0 26px 44px -18px ${withAlpha(deep, 0.5)}`,
        }}
      >
        {coverUrl ? (
          // Signed storage URLs are short-lived and private; a plain img avoids next/image host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={`Cover of ${title}`} className="h-full w-full object-cover" />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${track.art.skyTop}, ${track.cover})`,
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: withAlpha(deep, 0.55) }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              {pending ? <CoverPress /> : null}
              <p className="mt-5 font-display text-xl font-bold text-cream">
                {failed
                  ? "We couldn't finish this cover"
                  : pending
                    ? "Lettering your cover"
                    : "Your cover is on its way"}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: withAlpha("#fffaf3", 0.85) }}>
                {failed
                  ? "Please try creating the book again. Your order is saved."
                  : pending
                    ? "The title and your child's name are painted into the picture, not printed on top."
                    : "We'll paint the cover as soon as the story is finished."}
              </p>
            </div>
          </>
        )}

        {/* Spine, so the plate reads as a book rather than a photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3.5%]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${withAlpha(deep, 0.9)} 0%, ${withAlpha(
              deep,
              0.3,
            )} 70%, ${withAlpha(deep, 0)} 100%)`,
          }}
        />
      </div>
      <figcaption className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        {coverUrl ? "Your cover" : failed ? "Cover not ready" : "Cover in progress"}
      </figcaption>
    </figure>
  );
}

function CoverPress() {
  return (
    <span aria-hidden="true" className="flex items-center gap-2">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="ink-pulse h-2.5 w-2.5 rounded-full bg-cream"
          style={{ animationDelay: `${index * 0.18}s` }}
        />
      ))}
    </span>
  );
}
