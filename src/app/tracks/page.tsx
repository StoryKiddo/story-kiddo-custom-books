import type { Metadata } from "next";
import { TrackPicker } from "@/components/track-picker";
import { TRACKS } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Choose a track",
  description: "Pick an educational theme for your child's personalized Story Kiddo book.",
};

export default function TracksPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <div className="mb-10 max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sage">
          Step 1 of 2
        </p>
        <h1 className="text-4xl text-ink">What should this book teach?</h1>
        <p className="text-lg text-ink-soft">
          Choose one educational track. You&apos;ll add your child&apos;s photo,
          name, and age on the next page.
        </p>
      </div>
      <TrackPicker tracks={TRACKS} />
    </div>
  );
}
