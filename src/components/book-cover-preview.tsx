/**
 * The order preview's book cover. The title is typeset on the artwork itself
 * (see `StoryBookCover`), sitting on the first signed preview illustration when
 * one exists and on the theme's own scene until then.
 */

import { StoryBookCover } from "@/components/story-book-cover";
import type { Track } from "@/lib/tracks";

export function BookCoverPreview({
  title,
  subtitle,
  byline,
  track,
  imageUrl,
}: {
  title: string;
  subtitle: string | null;
  byline: string | null;
  track: Track;
  imageUrl: string | null;
}) {
  return (
    <figure className="mx-auto mt-10 w-full max-w-[20.5rem] sm:max-w-[23rem]">
      <StoryBookCover
        track={track}
        title={title}
        subtitle={subtitle}
        byline={byline}
        imageUrl={imageUrl}
      />
      <figcaption className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        {imageUrl ? "Your cover, painted from your story" : "Your cover, painting soon"}
      </figcaption>
    </figure>
  );
}
