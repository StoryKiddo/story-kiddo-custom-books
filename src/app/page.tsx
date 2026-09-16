import Link from "next/link";
import { BestsellerRail, HomeHero } from "@/components/home-hero";
import { HowItWorks } from "@/components/how-it-works";
import { TrackCard } from "@/components/track-card";
import { createHrefForLaunchTrack, themeTileHref } from "@/lib/track-links";
import { customerFacingTracks } from "@/lib/tracks";

export default function HomePage() {
  const tracks = customerFacingTracks();

  return (
    <div>
      <HomeHero />

      <BestsellerRail tracks={tracks} />

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
        <div className="mb-8 max-w-xl sm:mb-10">
          <h2 className="text-3xl tracking-tight text-ink sm:text-4xl">
            The Alphabet book
          </h2>
          <p className="mt-3 text-ink-soft">
            Letter adventures from A to Z, starring your child. More educational
            themes are coming later — this first book is the one you can make
            today.
          </p>
        </div>
        <div className="grid max-w-md gap-6 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {tracks.map((track) => (
            <TrackCard
              key={track.slug}
              track={track}
              href={themeTileHref(track)}
              action="Start this book"
            />
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          <Link
            href={createHrefForLaunchTrack()}
            className="font-semibold text-coral underline decoration-coral/40 underline-offset-4"
          >
            Personalize the Alphabet book
          </Link>
        </p>
      </section>
    </div>
  );
}
