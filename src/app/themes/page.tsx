import type { Metadata } from "next";
import Link from "next/link";
import { TrackCard } from "@/components/track-card";
import { createHrefForLaunchTrack, themeTileHref } from "@/lib/track-links";
import { customerFacingTracks } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Alphabet book",
  description: "Personalize the Story Kiddo Alphabet book starring your child.",
};

export default function TracksPage() {
  const tracks = customerFacingTracks();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <div className="mb-10 max-w-2xl space-y-4 sm:mb-12">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
          Launching first
        </p>
        <h1 className="text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">
          The Alphabet book
        </h1>
        <p className="text-base leading-relaxed text-ink-soft sm:text-lg">
          Letter adventures from A to Z, starring your child. Add a photo and
          we&apos;ll take you into the personalize flow. More educational themes
          are coming later.
        </p>
      </div>
      <div className="grid max-w-md gap-6 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        {tracks.map((track) => (
          <TrackCard key={track.slug} track={track} href={themeTileHref(track)} />
        ))}
      </div>
      <p className="mt-10 max-w-xl rounded-[24px] border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
        Numbers, colors, feelings, and the rest of the shelf are coming later.
        We&apos;re launching with the Alphabet book first —{" "}
        <Link
          href={createHrefForLaunchTrack()}
          className="font-semibold text-coral underline decoration-coral/40 underline-offset-4"
        >
          start with Alphabet
        </Link>
        .
      </p>
    </div>
  );
}
