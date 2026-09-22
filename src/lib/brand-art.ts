/**
 * Static brand images in `public/brand/`.
 *
 * Alphabet ships as the supplied WebP files. Other theme rasters stay on disk
 * for later rounds and are not shown on customer-facing pages yet.
 */

import { isLaunchTrack } from "./tracks.ts";

export const HERO_GIFT_SRC = "/brand/hero/gift-moment.webp";
export const HERO_PRESS_SRC = "/brand/hero/book-press.webp";
export const PARCHMENT_SRC = "/brand/panels/parchment.webp";

/** Real-life Alphabet photography in `public/brand/lifestyle/`. */
export const LIFESTYLE = {
  momGives: {
    src: "/brand/lifestyle/alphabet-mom-gives-book.webp",
    alt: "A mother on the living-room rug handing a personalized Alphabet hardcover to a little girl who reaches for it, smiling",
  },
  grandparentsGive: {
    src: "/brand/lifestyle/alphabet-grandparents-give-book.webp",
    alt: "Grandparents on the sofa with a girl and boy as they open a personalized Alphabet hardcover together",
  },
  parentChild: {
    src: "/brand/lifestyle/alphabet-parent-child.webp",
    alt: "A mother and daughter on the sofa reading an open Alphabet hardcover with the child's name on the cover",
  },
  bedtime: {
    src: "/brand/lifestyle/alphabet-bedtime.webp",
    alt: "A father and son in bed at night, reading an open Alphabet hardcover by lamplight",
  },
  hands: {
    src: "/brand/lifestyle/alphabet-hands.webp",
    alt: "Close-up of a child's hands turning a page of a personalized Alphabet hardcover, with crayons on the table",
  },
} as const;

export const BRAND_IMAGE_SIZE = {
  cover: { width: 1254, height: 1254 },
  mockup: { width: 1254, height: 1254 },
  tile: { width: 1448, height: 1086 },
  gift: { width: 1672, height: 941 },
  press: { width: 1448, height: 1086 },
  lifestyle: { width: 1536, height: 1024 },
} as const;

function rasterExt(slug: string): "webp" | "png" {
  return isLaunchTrack(slug) ? "webp" : "png";
}

export function mockupSrc(slug: string): string {
  return `/brand/mockups/${slug}.${rasterExt(slug)}`;
}

export function coverSrc(slug: string): string {
  return `/brand/covers/${slug}.${rasterExt(slug)}`;
}

export function tileSrc(slug: string): string {
  return `/brand/tiles/${slug}.webp`;
}
