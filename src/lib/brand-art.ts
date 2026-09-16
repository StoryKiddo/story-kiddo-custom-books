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

export const BRAND_IMAGE_SIZE = {
  cover: { width: 1254, height: 1254 },
  mockup: { width: 1254, height: 1254 },
  tile: { width: 1448, height: 1086 },
  gift: { width: 1672, height: 941 },
  press: { width: 1448, height: 1086 },
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
