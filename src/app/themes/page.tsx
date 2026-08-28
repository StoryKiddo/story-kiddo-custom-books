import type { Metadata } from "next";
import { TrackPicker } from "@/components/track-picker";
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
          Step 1 of 2
        </p>
        <h1 className="text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">
          What should this book teach?
        </h1>
        <p className="text-base leading-relaxed text-ink-soft sm:text-lg">
          Choose one educational theme. You&apos;ll add your child&apos;s photo,
          name, and age on the next page.
        </p>
      </div>
      <TrackPicker tracks={TRACKS} />
    </div>
  );
}
