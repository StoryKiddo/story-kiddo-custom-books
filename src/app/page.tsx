import Link from "next/link";
import { HeroBook } from "@/components/hero-book";
import { HowItWorks } from "@/components/how-it-works";
import { TrackCard } from "@/components/track-card";
import { TRACKS } from "@/lib/tracks";

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sage">
            Story Kiddo Custom Books
          </p>
          <h1 className="max-w-xl text-4xl leading-[1.12] text-ink sm:text-5xl">
            A storybook starring your child.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-ink-soft">
            Choose an educational track, add a photo, and we&apos;ll create a
            personalized illustrated book — for letters, numbers, feelings,
            first days, and the values you want to grow.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tracks"
              className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[3px_3px_0_0_#b54e35] transition hover:bg-coral-dark"
            >
              Choose a track
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-ink/15 bg-white/70 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white"
            >
              How it works
            </Link>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <HeroBook />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 pb-16">
        <h2 className="mb-6 text-3xl text-ink">How a Story Kiddo book is made</h2>
        <HowItWorks />
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl text-ink">Eight educational tracks</h2>
            <p className="mt-2 max-w-xl text-ink-soft">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKS.map((track) => (
            <TrackCard key={track.slug} track={track} href="/tracks" />
          ))}
        </div>
      </section>
    </div>
  );
}
