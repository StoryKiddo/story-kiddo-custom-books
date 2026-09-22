/**
 * The illustrated scene for a theme, inlined as SVG.
 *
 * The drawing itself comes from `src/lib/art/scene.ts` — the same module the
 * asset script rasterizes into the cover art and book mockups in
 * `public/brand/`, so a tile and a printed cover are the same picture.
 */

import { themeScene, type SceneShape, type SceneTrack } from "@/lib/art/scene";

export function ThemeArt({
  track,
  className = "",
  shape = "wide",
  /** Distinguishes gradient ids when the same scene appears twice on a page. */
  instance,
}: {
  track: SceneTrack;
  className?: string;
  shape?: SceneShape;
  instance?: string;
}) {
  const scene = themeScene(track, {
    shape,
    uid: `${track.slug}-${shape}${instance ? `-${instance}` : ""}`,
  });

  return (
    <svg
      aria-hidden="true"
      viewBox={scene.viewBox}
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      // Trusted, static markup built from the theme palette — no user input.
      dangerouslySetInnerHTML={{ __html: scene.markup }}
    />
  );
}
