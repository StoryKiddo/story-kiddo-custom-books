import Link from "next/link";
import { ThemeArt } from "@/components/theme-art";
import { withAlpha } from "@/lib/color";
import type { Track } from "@/lib/tracks";

/**
 * A theme tile: an illustrated scene torn along a deckled paper edge, over a
 * cream panel carrying the copy. The whole tile is one link straight to the
 * personalize step for that theme.
 */
export function TrackCard({
  track,
  href,
  action = "Start this book",
}: {
  track: Track;
  href: string;
  action?: string;
}) {
  const { deep, accent } = track.art;

  return (
    <Link
      href={href}
      className="theme-tile group relative flex flex-col overflow-hidden rounded-[26px] border border-ink/10 bg-cream text-left shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_16px_26px_-20px_rgba(36,28,22,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="theme-tile-art absolute inset-0">
          <ThemeArt track={track} />
        </div>
        <span
          className="absolute right-3.5 top-3.5 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] shadow-[0_2px_6px_-2px_rgba(36,28,22,0.35)]"
          style={{ background: withAlpha("#fffaf4", 0.94), color: deep }}
        >
          {track.ageRange}
        </span>
        <DeckleEdge />
      </div>

      <div className="paper-grain relative flex flex-1 flex-col gap-2 px-5 pb-5 pt-1">
        <h3
          className="font-cover text-[1.4rem] font-bold leading-tight tracking-[-0.01em]"
          style={{ color: deep }}
        >
          {track.name}
        </h3>
        <p className="text-sm leading-relaxed text-ink-soft">{track.tagline}</p>
        <p
          className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold"
          style={{ color: deep }}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          {action}
          <span className="theme-tile-nudge inline-block" aria-hidden="true">
            →
          </span>
        </p>
      </div>
    </Link>
  );
}

/** Torn-paper edge where the illustration meets the cream panel. */
function DeckleEdge() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 26"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-px h-6 w-full text-cream"
    >
      <path
        d="M0 26V13c22-9 44-9 66 0s44 9 66 0 44-9 66 0 44 9 66 0 44-9 66 0 44 9 70 1v12Z"
        fill="currentColor"
      />
    </svg>
  );
}
