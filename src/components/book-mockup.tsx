/**
 * A standing hardcover — the rasterized 3D mockup for a theme, painted by
 * `scripts/generate-art.ts`. The title is part of the artwork, so nothing is
 * typeset on top of it here.
 */

import Image from "next/image";
import { personalizedBookCopy } from "@/lib/book-title";
import type { Track } from "@/lib/tracks";

export function mockupSrc(slug: string): string {
  return `/brand/mockups/${slug}.png`;
}

export function coverSrc(slug: string): string {
  return `/brand/covers/${slug}.png`;
}

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
      alt={`${exampleTitle(track)} — an example Story Kiddo ${track.name.toLowerCase()} book`}
      width={1100}
      height={1240}
      sizes={sizes}
      priority={priority}
      className={`book-mockup h-auto w-full ${className}`}
    />
  );
}
