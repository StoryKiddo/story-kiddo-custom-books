/**
 * Homepage header, built in two layers the way the reference structure does
 * it: the feeling of the gift underneath, and real books standing in front of
 * it. Both are static art from `public/brand/`, painted by
 * `scripts/generate-art.ts`.
 */

import Image from "next/image";
import Link from "next/link";
import { BookMockup } from "@/components/book-mockup";
import { THEME_GALLERY_HREF, createHrefForTrack } from "@/lib/track-links";
import { getTrackBySlug, type Track } from "@/lib/tracks";

const FRONT_BOOKS = ["alphabet", "animals-nature", "emotions"]
  .map((slug) => getTrackBySlug(slug))
  .filter((track): track is Track => Boolean(track));

export function HomeHero() {
  const [lead, second, third] = FRONT_BOOKS;

  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:pb-24">
        <div className="relative z-10 text-center lg:text-left">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-cream/85 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-soft backdrop-blur-sm sm:text-[0.7rem]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
            Personalized picture books
          </p>
          <h1
            className="mt-5 leading-[0.95] tracking-[-0.03em] text-ink"
            style={{ fontSize: "clamp(2.4rem, 7vw, 4.1rem)" }}
          >
            A storybook
            <span className="relative mt-1 block sm:mt-2">
              starring{" "}
              <em className="relative not-italic text-coral">
                your child
                <SwashUnderline />
              </em>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg lg:mx-0">
            Choose a theme, add a photo, and we write and illustrate a hardcover
            book where your child is the hero — their name lettered right into
            the cover art.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href={THEME_GALLERY_HREF}
              className="rounded-full bg-coral px-7 py-3.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_22px_-10px_rgba(171,71,40,0.8)] transition hover:-translate-y-0.5 hover:bg-coral-dark"
            >
              Make their book
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-ink/12 bg-cream/85 px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-cream"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft/80">
            Eight themes · Ages 2–8 · Up to four children per book
          </p>
        </div>

        <div className="relative">
          {/* Layer one: the moment the book is opened. */}
          <figure className="relative overflow-hidden rounded-[32px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_30px_50px_-28px_rgba(35,26,19,0.55)]">
            <Image
              src="/brand/hero/gift-moment.png"
              alt="A grown-up and a child on the sofa, reading the child's own storybook together"
              width={1600}
              height={1100}
              priority
              sizes="(min-width: 1024px) 34rem, 92vw"
              className="h-auto w-full"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-6 pb-4 pt-14 text-left text-sm font-semibold text-cream">
              Their name on the cover. Their face on every page.
            </figcaption>
          </figure>

          {/* Layer two: the books themselves, standing in front. */}
          <div className="pointer-events-none absolute -bottom-10 -left-4 w-[42%] max-w-[13rem] sm:-bottom-14 sm:left-2 lg:-left-10 lg:w-[46%]">
            <BookMockup track={lead} priority sizes="(min-width: 1024px) 14rem, 40vw" />
          </div>
          <div className="pointer-events-none absolute -bottom-4 left-[30%] w-[30%] max-w-[9.5rem] opacity-95 sm:left-[32%] lg:w-[32%]">
            <BookMockup track={second} sizes="(min-width: 1024px) 10rem, 28vw" />
          </div>
          <div className="pointer-events-none absolute -right-2 -bottom-6 hidden w-[26%] max-w-[8.5rem] sm:block lg:-right-6">
            <BookMockup track={third} sizes="(min-width: 1024px) 9rem, 24vw" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A rail of finished books, one per theme, each going straight into the flow. */
export function BestsellerRail({ tracks }: { tracks: Track[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-6 pt-24 sm:pt-28 lg:pt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl tracking-tight text-ink sm:text-4xl">Personalize a bestseller</h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Every book is written and illustrated around one child. Pick the
            story you want them in.
          </p>
        </div>
      </div>

      <ul className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] sm:gap-7">
        {tracks.map((track) => (
          <li key={track.slug} className="w-[13rem] shrink-0 snap-start sm:w-[15rem]">
            <Link
              href={createHrefForTrack(track.slug)}
              className="book-shelf-item group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              <BookMockup track={track} sizes="15rem" />
              <p className="mt-1 font-display text-lg font-bold leading-tight text-ink">
                {track.name}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{track.tagline}</p>
              <p className="mt-2 text-sm font-semibold text-coral">
                Personalize this book
                <span className="theme-tile-nudge ml-1 inline-block" aria-hidden="true">
                  →
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SwashUnderline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 18"
      preserveAspectRatio="none"
      className="absolute -bottom-2 left-0 h-3 w-full text-gold sm:-bottom-3 sm:h-4"
    >
      <path
        d="M3 12c46-7 92-10 138-8 34 1 62 4 96 9"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </svg>
  );
}

/** Warm light and paper grain behind the hero. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="paper-grain pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,rgba(244,206,150,0.5),transparent_62%),radial-gradient(ellipse_55%_45%_at_5%_25%,rgba(213,97,63,0.14),transparent_60%)]" />
      <div className="absolute left-1/2 top-[-16rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#f8dcae]/45 blur-[100px]" />
      <svg
        className="absolute inset-x-0 bottom-0 h-40 w-full text-paper-deep"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
      >
        <path
          d="M0 96c180-42 340-42 520-8 168 32 340 34 520 4 60-10 120-14 160-12v80H0Z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M0 126c200-36 360-30 540 2 160 28 320 26 480-4 60-11 120-16 180-14v50H0Z"
          fill="currentColor"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}
