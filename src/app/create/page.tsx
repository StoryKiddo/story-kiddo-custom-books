import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChildDetailsForm } from "@/components/child-details-form";
import { TrackIcon } from "@/components/track-icon";
import { getTrackBySlug } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Personalize your book",
};

export const maxDuration = 300;

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track: slug } = await searchParams;
  if (!slug) {
    redirect("/themes");
  }

  const track = getTrackBySlug(slug);
  if (!track) {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
      <aside
        className="h-fit rounded-[28px] p-6 shadow-[0_12px_28px_-16px_rgba(36,28,22,0.2)] sm:p-7"
        style={{ background: track.cover }}
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink/70 sm:text-xs">
          Step 2 of 2
        </p>
        <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60">
          <TrackIcon slug={track.slug} ink={track.ink} />
        </div>
        <h1 className="mt-4 font-display text-3xl tracking-tight text-ink">{track.name}</h1>
        <p className="mt-2 text-ink/80">{track.description}</p>
        <p className="mt-4 text-sm font-semibold text-ink-soft">{track.ageRange}</p>
        <Link
          href="/themes"
          className="mt-6 inline-block text-sm font-semibold text-ink underline underline-offset-4"
        >
          Choose a different theme
        </Link>
      </aside>

      <section className="rounded-[28px] border border-rule bg-cream/80 p-6 sm:p-8">
        <h2 className="text-2xl text-ink">Tell us about your child</h2>
        <p className="mt-2 mb-8 text-ink-soft">
          We&apos;ll use this to personalize the story — name, age, interests, and
          an optional note. You can include up to four children in the same book.
        </p>
        <ChildDetailsForm track={track} />
      </section>
    </div>
  );
}
