/**
 * Small cover illustrations for each educational track.
 * Drawn as inline SVG so we don't need image assets yet.
 */

import type { Track } from "@/lib/tracks";

export function TrackIcon({ slug, ink }: Pick<Track, "slug" | "ink">) {
  const common = {
    fill: "none",
    stroke: ink,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (slug) {
    case "alphabet":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <text x="4" y="34" fontSize="26" fontWeight="700" fill={ink} fontFamily="Georgia, serif">
            Aa
          </text>
        </svg>
      );
    case "numbers":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <text x="6" y="34" fontSize="22" fontWeight="700" fill={ink} fontFamily="Georgia, serif">
            123
          </text>
        </svg>
      );
    case "colors-shapes":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <circle cx="16" cy="18" r="8" fill={ink} opacity="0.85" />
          <rect x="24" y="22" width="16" height="16" rx="2" fill={ink} opacity="0.55" />
          <path d="M28 10 L38 26 H18 Z" fill={ink} opacity="0.7" />
        </svg>
      );
    case "emotions":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <circle cx="24" cy="24" r="14" {...common} />
          <circle cx="18.5" cy="21" r="1.6" fill={ink} />
          <circle cx="29.5" cy="21" r="1.6" fill={ink} />
          <path d="M17 29c2.2 3 11.8 3 14 0" {...common} />
        </svg>
      );
    case "kindness-values":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <path
            d="M24 38s-12-7.4-12-16.2C12 16 16.2 13 20 15.2 22 16.4 23 18.5 24 20c1-1.5 2-3.6 4-4.8C31.8 13 36 16 36 21.8 36 30.6 24 38 24 38Z"
            fill={ink}
            opacity="0.85"
          />
        </svg>
      );
    case "life-milestones":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <path d="M24 8l3.4 9.2H37l-7.7 5.7 2.9 9.1L24 26.6l-8.2 5.4 2.9-9.1L11 17.2h9.6L24 8Z" fill={ink} />
        </svg>
      );
    case "animals-nature":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <path d="M24 38 V18" {...common} />
          <path d="M24 20c-6-8-12-6-12-6 2 6 8 8 12 8" fill={ink} opacity="0.75" />
          <path d="M24 22c6-7 12-5 12-5-2 6-8 8-12 8" fill={ink} opacity="0.5" />
          <circle cx="33" cy="13" r="3" fill={ink} />
        </svg>
      );
    case "manners":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <path d="M14 32c2-8 6-12 10-12s8 4 10 12" {...common} />
          <path d="M16 20c2-6 6-9 8-9s6 3 8 9" {...common} />
          <path d="M18 32 h12" {...common} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12">
          <rect x="10" y="12" width="28" height="24" rx="3" {...common} />
        </svg>
      );
  }
}
