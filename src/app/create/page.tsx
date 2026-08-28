import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChildDetailsForm } from "@/components/child-details-form";
import { TrackIcon } from "@/components/track-icon";
import { getTrackBySlug } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Personalize your book",
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track: slug } = await searchParams;
  if (!slug) {
    redirect("/tracks");
  }

  const track = getTrackBySlug(slug);
  if (!track) {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
      <aside
        className="h-fit rounded-[28px] p-6 shadow-[3px_3px_0_0_rgba(43,36,28,0.12)]"
        style={{ background: track.cover }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/70">
          Step 2 of 2
        </p>
        <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60">
          <TrackIcon slug={track.slug} ink={track.ink} />
        </div>
        <h1 className="mt-4 font-display text-3xl text-ink">{track.name}</h1>
        <p className="mt-2 text-ink/80">{track.description}</p>
        <p className="mt-4 text-sm font-semibold text-ink-soft">{track.ageRange}</p>
        <Link
          href="/tracks"
          className="mt-6 inline-block text-sm font-semibold text-ink underline underline-offset-4"
        >
          Choose a different track
        </Link>
      </aside>

      <section className="rounded-[28px] border border-rule bg-white/70 p-6 sm:p-8">
        <h2 className="text-2xl text-ink">Tell us about your child</h2>
        <p className="mt-2 mb-8 text-ink-soft">
          We&apos;ll use this to personalize the story. Illustration generation
          is not wired up yet — this step saves the order.
        </p>
        <ChildDetailsForm track={track} />
      </section>
    </div>
  );
}
