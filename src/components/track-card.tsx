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
        className="absolute inset-y-0 left-0 w-2.5 rounded-l-[18px]"
        style={{ background: track.ink }}
      />
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/55">
        <TrackIcon slug={track.slug} ink={track.ink} />
      </span>
      <span className="mt-auto space-y-1 pl-1">
        <span className="block font-display text-xl leading-tight text-ink">
          {track.name}
        </span>
        <span className="block text-sm leading-snug text-ink/80">{track.tagline}</span>
        <span className="mt-2 inline-block rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-ink-soft">
          {track.ageRange}
        </span>
      </span>
    </>
  );

  const className = [
    "relative flex min-h-[230px] flex-col gap-4 rounded-[20px] border-2 p-5 pl-7 text-left shadow-[3px_3px_0_0_rgba(43,36,28,0.12)] transition",
    selected
      ? "border-ink ring-2 ring-ink/20"
      : "border-transparent hover:-translate-y-0.5 hover:border-ink/20",
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
