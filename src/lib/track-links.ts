/**
 * Where a theme takes you.
 *
 * Theme tiles used to point at the gallery, where a parent had to scroll,
 * select, and press Continue. Every tile now links straight to the personalize
 * step for that theme, so picking a theme is a single click.
 */

/** Route for the gallery of all eight themes. Not a step in the order flow. */
export const THEME_GALLERY_HREF = "/themes";

/** The personalize step for one theme, e.g. `/create?track=alphabet`. */
export function createHrefForTrack(slug: string): string {
  return `/create?track=${encodeURIComponent(slug)}`;
}

/** Destination of a theme tile, wherever it is rendered on the site. */
export function themeTileHref(track: { slug: string }): string {
  return createHrefForTrack(track.slug);
}
