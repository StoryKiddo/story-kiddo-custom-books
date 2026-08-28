import Link from "next/link";
import { TrackIcon } from "@/components/track-icon";
import type { Track } from "@/lib/tracks";

type TrackCardProps = {
  track: Track;
  /** When set, the whole cover is a link (used on the homepage preview). */
  href?: string;
  selected?: boolean;
  onSelect?: () => void;
};

/**
 * A little picture-book cover. Used both as a button (on /tracks) and as a
 * link (on the homepage). The left edge is a darker "spine".
 */
export function TrackCard({ track, href, selected, onSelect }: TrackCardProps) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2.5 rounded-l-[22px]"
        style={{ background: track.ink }}
      />
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/55 transition-transform duration-300 ease-out motion-safe:group-hover:scale-105">
        <TrackIcon slug={track.slug} ink={track.ink} />
      </span>
      <span className="mt-auto space-y-1.5 pl-1">
        <span className="block font-display text-xl leading-tight text-ink">
          {track.name}
        </span>
        <span className="block text-sm leading-relaxed text-ink/80">
          {track.tagline}
        </span>
        <span className="mt-2.5 inline-block rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
          {track.ageRange}
        </span>
      </span>
    </>
  );

  const className = [
    "track-cover group relative flex min-h-[252px] flex-col gap-5 rounded-[22px] border-2 p-6 pl-8 text-left",
    "shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_10px_22px_-12px_rgba(36,28,22,0.18)]",
    "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_20px_36px_-14px_rgba(36,28,22,0.22)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
    selected
      ? "border-ink ring-2 ring-ink/20"
      : "border-transparent hover:border-ink/15",
  ].join(" ");

  if (href) {
    return (
      <Link href={href} className={className} style={{ background: track.cover }}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={className}
      style={{ background: track.cover }}
    >
      {inner}
    </button>
  );
}
