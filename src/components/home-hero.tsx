/**
 * Homepage header: a shelf of finished Story Kiddo books with the headline set
 * into the middle of the arrangement. Covers are the real `StoryBookCover`
 * component with titles from the real title generator, so the hero shows the
 * actual product rather than placeholder slots.
 */

import Link from "next/link";
import { StoryBookCover } from "@/components/story-book-cover";
import { personalizedBookCopy } from "@/lib/book-title";
import { THEME_GALLERY_HREF, createHrefForTrack } from "@/lib/track-links";
import { getTrackBySlug, type Track } from "@/lib/tracks";

type ExampleBook = {
  track: Track;
  title: string;
  byline: string;
};

function exampleBook(slug: string, name: string, age: number): ExampleBook | null {
  const track = getTrackBySlug(slug);
  if (!track) return null;
  return {
    track,
    title: personalizedBookCopy([{ name }], track).title,
    byline: `Starring ${name}, age ${age}`,
  };
}

const EXAMPLES = [
  exampleBook("emotions", "Mia", 5),
  exampleBook("alphabet", "Dylan", 4),
  exampleBook("animals-nature", "Theo", 6),
  exampleBook("numbers", "Ava", 3),
].filter((book): book is ExampleBook => book !== null);

export function HomeHero() {
  const [farLeft, nearLeft, nearRight, farRight] = EXAMPLES;

  return (
    <section className="relative overflow-hidden">
      <HeroSky />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pb-24">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)_minmax(0,1fr)] lg:items-center">
          <ShelfStack books={[farLeft, nearLeft]} side="left" />

          <div className="relative z-20 text-center">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-cream/80 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-soft backdrop-blur-sm sm:text-[0.7rem]">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
              Personalized picture books
            </p>
            <h1
              className="mt-5 leading-[0.98] tracking-[-0.03em] text-ink"
              style={{ fontSize: "clamp(1.8rem, 8.6vw, 3.75rem)" }}
            >
              A storybook
              <span className="relative mt-1 block whitespace-nowrap sm:mt-2">
                starring{" "}
                <em className="relative font-cover not-italic text-coral">
                  your child
                  <SwashUnderline />
                </em>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
              Pick an educational theme, add a photo, and we illustrate and write a
              book where your child is the hero of every page.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={createHrefForTrack("alphabet")}
                className="rounded-full bg-coral px-7 py-3.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_22px_-10px_rgba(181,78,53,0.8)] transition hover:-translate-y-0.5 hover:bg-coral-dark"
              >
                Make a book
              </Link>
              <Link
                href={THEME_GALLERY_HREF}
                className="rounded-full border border-ink/12 bg-cream/85 px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-cream"
              >
                Browse the themes
              </Link>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft/80">
              Eight themes · Ages 2–8 · Up to four children per book
            </p>
          </div>

          <ShelfStack books={[nearRight, farRight]} side="right" />
        </div>

        <MobileShelf books={EXAMPLES.slice(0, 3)} />
      </div>
    </section>
  );
}

/** Two covers leaning together, cradling the headline from one side. */
function ShelfStack({ books, side }: { books: ExampleBook[]; side: "left" | "right" }) {
  const [far, near] = books;
  const left = side === "left";

  return (
    <div className={`relative z-10 hidden lg:block ${left ? "lg:pr-6" : "lg:pl-6"}`}>
      <div className={`flex flex-col ${left ? "items-start" : "items-end"}`}>
        <ShelfBook
          book={far}
          className={`w-[12.5rem] xl:w-[13.5rem] ${left ? "-rotate-[7deg]" : "rotate-[7deg]"}`}
          delay="0s"
        />
        <ShelfBook
          book={near}
          className={`mt-6 w-[9.5rem] xl:w-[10.5rem] ${
            left ? "ml-8 rotate-[4deg] xl:ml-14" : "mr-8 -rotate-[4deg] xl:mr-14"
          }`}
          delay="1.6s"
        />
      </div>
    </div>
  );
}

function MobileShelf({ books }: { books: ExampleBook[] }) {
  const [left, center, right] = books;
  return (
    <div className="mt-12 flex items-end justify-center lg:hidden">
      <ShelfBook book={left} className="w-[7.5rem] -rotate-[9deg] translate-x-5 sm:w-[9rem]" delay="0s" />
      <ShelfBook book={center} className="z-10 w-[9.5rem] sm:w-[11.5rem]" delay="1.2s" />
      <ShelfBook book={right} className="w-[7.5rem] rotate-[9deg] -translate-x-5 sm:w-[9rem]" delay="2.4s" />
    </div>
  );
}

function ShelfBook({
  book,
  className = "",
  delay = "0s",
}: {
  book: ExampleBook;
  className?: string;
  delay?: string;
}) {
  return (
    <figure className={`shelf-float relative ${className}`} style={{ animationDelay: delay }}>
      <StoryBookCover
        track={book.track}
        title={book.title}
        byline={book.byline}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-3 -bottom-4 h-5 rounded-[50%] bg-ink/18 blur-md"
      />
    </figure>
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

/** Warm sky, sun arc, and paper grain behind the shelf. */
function HeroSky() {
  return (
    <div aria-hidden="true" className="paper-grain pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,206,150,0.55),transparent_62%),radial-gradient(ellipse_60%_50%_at_8%_20%,rgba(217,107,79,0.16),transparent_60%),radial-gradient(ellipse_60%_50%_at_95%_15%,rgba(122,158,130,0.14),transparent_58%)]" />
      <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#f7d9a8]/45 blur-[90px]" />
      <svg
        className="absolute inset-x-0 bottom-0 h-40 w-full text-paper-deep"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
      >
        <path d="M0 96c180-42 340-42 520-8 168 32 340 34 520 4 60-10 120-14 160-12v80H0Z" fill="currentColor" opacity="0.55" />
        <path d="M0 126c200-36 360-30 540 2 160 28 320 26 480-4 60-11 120-16 180-14v50H0Z" fill="currentColor" opacity="0.8" />
      </svg>
      <svg className="absolute inset-0 h-full w-full text-gold" viewBox="0 0 1200 640" fill="none">
        <g opacity="0.6">
          <path d="M148 96l4.2 8.8 9.8 1.2-7.2 6.8 1.9 9.6L148 118l-8.7 4.4 1.9-9.6-7.2-6.8 9.8-1.2Z" fill="currentColor" />
          <path d="M1058 132l3.4 7.2 8 1-5.9 5.5 1.6 7.8-7.1-3.7-7.1 3.5 1.6-7.8-5.9-5.5 8-1Z" fill="currentColor" />
          <path d="M92 380l2.8 5.8 6.5.8-4.8 4.5 1.3 6.4-5.8-3-5.8 2.9 1.3-6.4-4.8-4.5 6.5-.8Z" fill="currentColor" />
          <circle cx="1128" cy="330" r="3" fill="var(--coral)" opacity="0.5" />
          <circle cx="612" cy="54" r="2.4" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
