/**
 * Homepage header: the gift-moment and book-press photographs, with the
 * Alphabet hardcover standing in front. Titles live in the mockup art, so
 * nothing is typeset over that image.
 */

import Image from "next/image";
import Link from "next/link";
import { BookMockup } from "@/components/book-mockup";
import { BRAND_IMAGE_SIZE, HERO_GIFT_SRC, HERO_PRESS_SRC } from "@/lib/brand-art";
import { createHrefForLaunchTrack } from "@/lib/track-links";
import { launchTrack, type Track } from "@/lib/tracks";

export function HomeHero() {
  const alphabet = launchTrack();

  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:pb-24">
        <div className="relative z-10 text-center lg:text-left">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-cream/85 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-soft backdrop-blur-sm sm:text-[0.7rem]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
            Personalized Alphabet books
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
            Add a photo, and we write and illustrate a hardcover Alphabet book
            where your child is the hero — their name lettered right into the
            cover art.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href={createHrefForLaunchTrack()}
              className="rounded-full bg-coral px-7 py-3.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_22px_-10px_rgba(171,71,40,0.8)] transition hover:-translate-y-0.5 hover:bg-coral-dark"
            >
              Make their Alphabet book
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-ink/12 bg-cream/85 px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-cream"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft/80">
            Alphabet · Ages 2–6 · Up to four children per book
          </p>
        </div>

        <div className="relative">
          <figure className="relative overflow-hidden rounded-[32px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_30px_50px_-28px_rgba(35,26,19,0.55)]">
            <Image
              src={HERO_GIFT_SRC}
              alt="A grown-up and a child on the sofa, reading the child's own storybook together"
              width={BRAND_IMAGE_SIZE.gift.width}
              height={BRAND_IMAGE_SIZE.gift.height}
              preload
              loading="eager"
              sizes="(min-width: 1024px) 34rem, 92vw"
              className="aspect-[16/9] w-full object-cover object-[62%_48%] sm:aspect-[7/5] lg:object-[58%_45%]"
            />
            <figcaption className="absolute left-0 top-0 m-4 rounded-full bg-cream/90 px-4 py-1.5 text-xs font-semibold text-ink shadow-[0_6px_14px_-8px_rgba(35,26,19,0.8)]">
              Their name on the cover. Their face on every page.
            </figcaption>
          </figure>

          {alphabet ? (
            <div className="pointer-events-none absolute inset-x-0 -bottom-12 flex items-end justify-end pr-1 sm:-bottom-16 sm:pr-4 lg:-bottom-20 lg:pr-6">
              <div className="w-[46%] max-w-[15rem] sm:w-[42%] sm:max-w-[17rem]">
                <BookMockup track={alphabet} priority sizes="(min-width: 1024px) 17rem, 42vw" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** A rail of finished books, each going straight into the flow. */
export function BestsellerRail({ tracks }: { tracks: Track[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-6 pt-24 sm:pt-28 lg:pt-16">
      <div className="mb-6 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div>
          <h2 className="text-3xl tracking-tight text-ink sm:text-4xl">
            Personalize the Alphabet book
          </h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Every copy is written and illustrated around one child. Start with
            a personalized Alphabet hardcover, made to order.
          </p>
        </div>
        <figure className="overflow-hidden rounded-[28px] border border-ink/10 shadow-[0_18px_32px_-24px_rgba(35,26,19,0.45)]">
          <Image
            src={HERO_PRESS_SRC}
            alt="An Alphabet storybook open on a studio desk, mid-illustration"
            width={BRAND_IMAGE_SIZE.press.width}
            height={BRAND_IMAGE_SIZE.press.height}
            sizes="(min-width: 1024px) 18rem, 92vw"
            className="aspect-[4/3] w-full object-cover object-center"
          />
        </figure>
      </div>

      <ul className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] sm:gap-7">
        {tracks.map((track) => (
          <li key={track.slug} className="w-[13rem] shrink-0 snap-start sm:w-[15rem]">
            <Link
              href={createHrefForLaunchTrack()}
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
