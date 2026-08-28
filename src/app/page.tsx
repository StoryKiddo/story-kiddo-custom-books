import Link from "next/link";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { HeroBook } from "@/components/hero-book";
import { HowItWorks } from "@/components/how-it-works";
import { TrackCard } from "@/components/track-card";
import { TRACKS } from "@/lib/tracks";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <HeroBackdrop />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-28">
          <div className="space-y-7 sm:space-y-8">
            <p className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
              <span className="hidden h-px w-8 bg-gold/80 sm:block" aria-hidden="true" />
              Story Kiddo Custom Books
            </p>
            <h1 className="max-w-xl text-[2.55rem] leading-[1.06] tracking-[-0.03em] text-ink sm:text-6xl lg:max-w-none lg:text-[4.35rem]">
              A storybook
              <span className="mt-1 block sm:mt-2">
                starring{" "}
                <em className="font-display not-italic text-coral">your child.</em>
              </span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
              Choose an educational track, add a photo, and we&apos;ll create a
              personalized illustrated book — for letters, numbers, feelings,
              first days, and the values you want to grow.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/tracks"
                className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark sm:px-7 sm:py-3.5"
              >
                Choose a track
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-full border border-ink/12 bg-cream/80 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream sm:px-7 sm:py-3.5"
              >
                How it works
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroBook />
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-16 pt-4 sm:pb-20"
      >
        <h2 className="mb-8 text-3xl tracking-tight text-ink sm:text-4xl">
          How a Story Kiddo book is made
        </h2>
        <HowItWorks />
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:pb-24">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <h2 className="text-3xl tracking-tight text-ink sm:text-4xl">
              Eight educational tracks
            </h2>
            <p className="mt-3 max-w-xl text-ink-soft">
              Each track is a different kind of story. Pick the one that matches
              what your child is learning right now.
            </p>
          </div>
          <Link
            href="/tracks"
            className="hidden shrink-0 text-sm font-semibold text-coral underline decoration-coral/40 underline-offset-4 sm:inline"
          >
            See all tracks
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {TRACKS.map((track) => (
            <TrackCard key={track.slug} track={track} href="/tracks" />
          ))}
        </div>
      </section>
    </div>
  );
}
