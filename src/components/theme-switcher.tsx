/**
 * Swap themes without leaving the personalize step. Each swatch is a little
 * illustrated book spine that links to the same form on another theme.
 */

import Link from "next/link";
import { ThemeArt } from "@/components/theme-art";
import { withAlpha } from "@/lib/color";
import { themeTileHref } from "@/lib/track-links";
import type { Track } from "@/lib/tracks";

export function ThemeSwitcher({
  tracks,
  selectedSlug,
}: {
  tracks: Track[];
  selectedSlug: string;
}) {
  return (
    <nav aria-label="Change theme" className="space-y-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">
        Or pick another theme
      </p>
      <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-8 lg:grid-cols-4">
        {tracks.map((track) => {
          const selected = track.slug === selectedSlug;
          return (
            <li key={track.slug}>
              <Link
                href={themeTileHref(track)}
                aria-current={selected ? "page" : undefined}
                title={track.name}
                className="group block"
              >
                <span
                  className="relative block aspect-[3/4] overflow-hidden rounded-[10px] transition"
                  style={{
                    boxShadow: selected
                      ? `0 0 0 2px ${track.art.deep}, 0 0 0 5px ${withAlpha(track.art.accent, 0.5)}`
                      : `0 0 0 1px ${withAlpha(track.art.deep, 0.25)}`,
                  }}
                >
                  <ThemeArt track={track} portrait />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 transition group-hover:opacity-0"
                    style={{
                      background: selected ? "transparent" : withAlpha("#fffaf4", 0.28),
                    }}
                  />
                </span>
                <span
                  className="mt-1.5 block truncate text-center text-[0.68rem] font-semibold leading-tight"
                  style={{ color: selected ? track.art.deep : "var(--ink-soft)" }}
                >
                  {track.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
