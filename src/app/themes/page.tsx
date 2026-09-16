import type { Metadata } from "next";
import { TrackCard } from "@/components/track-card";
import { themeTileHref } from "@/lib/track-links";
import { TRACKS } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Choose a theme",
  description: "Pick an educational theme for your child's personalized Story Kiddo book.",
};

export default function TracksPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <div className="mb-10 max-w-2xl space-y-4 sm:mb-12">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
          The full shelf
        </p>
        <h1 className="text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">
          What should this book teach?
        </h1>
        <p className="text-base leading-relaxed text-ink-soft sm:text-lg">
          Choose one educational theme and we&apos;ll take you straight to the
          page where you add your child&apos;s photo, name, and age.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        {TRACKS.map((track) => (
          <TrackCard key={track.slug} track={track} href={themeTileHref(track)} />
        ))}
      </div>
    </div>
  );
}
