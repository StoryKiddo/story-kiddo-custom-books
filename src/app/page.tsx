import Link from "next/link";
import { HomeHero } from "@/components/home-hero";
import { HowItWorks } from "@/components/how-it-works";
import { TrackCard } from "@/components/track-card";
import { THEME_GALLERY_HREF, themeTileHref } from "@/lib/track-links";
import { TRACKS } from "@/lib/tracks";

export default function HomePage() {
  return (
    <div>
      <HomeHero />

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 pb-16 pt-12 sm:pb-20"
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
              Eight educational themes
            </h2>
            <p className="mt-3 max-w-xl text-ink-soft">
              Each theme is a different kind of story. Pick the one that matches
              what your child is learning right now — it takes you straight to
              the page where you add their name and photo.
            </p>
          </div>
          <Link
            href={THEME_GALLERY_HREF}
            className="hidden shrink-0 text-sm font-semibold text-coral underline decoration-coral/40 underline-offset-4 sm:inline"
          >
            See all themes
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {TRACKS.map((track) => (
            <TrackCard key={track.slug} track={track} href={themeTileHref(track)} />
          ))}
        </div>
      </section>
    </div>
  );
}
