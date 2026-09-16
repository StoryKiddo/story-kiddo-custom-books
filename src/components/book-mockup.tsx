/**
 * A standing hardcover — the supplied 3D mockup for a theme. The title is
 * painted into the artwork, so nothing is typeset on top of it here.
 */

import Image from "next/image";
import { BRAND_IMAGE_SIZE, mockupSrc } from "@/lib/brand-art";
import { personalizedBookCopy } from "@/lib/book-title";
import type { Track } from "@/lib/tracks";

export { coverSrc, mockupSrc } from "@/lib/brand-art";

/** The invented child each example cover stars, matching the generated art. */
export const EXAMPLE_CHILDREN: Record<string, string> = {
  alphabet: "Mia",
  numbers: "Theo",
  "colors-shapes": "Ava",
  emotions: "Noah",
  "kindness-values": "Ruby",
  "life-milestones": "Kai",
  "animals-nature": "Ivy",
  manners: "Jonah",
};

export function exampleTitle(track: Track): string {
  const name = EXAMPLE_CHILDREN[track.slug];
  return personalizedBookCopy(name ? [{ name }] : [], track).title;
}

export function BookMockup({
  track,
  className = "",
  sizes = "(min-width: 1024px) 20rem, 60vw",
  priority = false,
}: {
  track: Track;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={mockupSrc(track.slug)}
      alt={`${exampleTitle(track)} — an example Story Kiddo ${track.name.toLowerCase()} hardcover`}
      width={BRAND_IMAGE_SIZE.mockup.width}
      height={BRAND_IMAGE_SIZE.mockup.height}
      sizes={sizes}
      preload={priority}
      loading={priority ? "eager" : "lazy"}
      className={`book-mockup h-auto w-full ${className}`}
    />
  );
}
