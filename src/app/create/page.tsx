import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChildDetailsForm } from "@/components/child-details-form";
import { ThemeArt } from "@/components/theme-art";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { withAlpha } from "@/lib/color";
import { THEME_GALLERY_HREF } from "@/lib/track-links";
import { TRACKS, getTrackBySlug } from "@/lib/tracks";

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
    redirect(THEME_GALLERY_HREF);
  }

  const track = getTrackBySlug(slug);
  if (!track) {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
      <aside className="h-fit space-y-6">
        <div
          className="relative overflow-hidden rounded-[28px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_32px_-24px_rgba(36,28,22,0.5)]"
        >
          <div className="relative aspect-[5/3]">
            <ThemeArt track={track} />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/3"
              style={{
                backgroundImage: `linear-gradient(0deg, ${withAlpha(
                  track.art.deep,
                  0.88,
                )} 0%, ${withAlpha(track.art.deep, 0.45)} 48%, ${withAlpha(track.art.deep, 0)} 100%)`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
              <p
                className="text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                style={{ color: withAlpha("#fffaf4", 0.85) }}
              >
                Your theme
              </p>
              <h1 className="cover-type mt-1 font-cover text-[2rem] font-bold leading-none text-[#fffaf4]">
                {track.name}
              </h1>
            </div>
          </div>
          <div className="paper-grain relative bg-cream px-6 py-5">
            <p className="text-ink-soft">{track.description}</p>
            <p
              className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: withAlpha(track.art.accent, 0.3),
                color: track.art.deep,
              }}
            >
              {track.ageRange}
            </p>
          </div>
        </div>

        <ThemeSwitcher tracks={TRACKS} selectedSlug={track.slug} />
      </aside>

      <section className="paper-grain relative rounded-[28px] border border-rule bg-cream/85 p-6 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_32px_-28px_rgba(36,28,22,0.4)] sm:p-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage">
          Last step
        </p>
        <h2 className="mt-2 font-cover text-[1.8rem] font-bold leading-tight text-ink sm:text-[2.1rem]">
          Tell us about your child
        </h2>
        <p className="mt-2 mb-8 text-ink-soft">
          We&apos;ll use this to personalize the story — name, age, interests, and
          an optional note. You can include up to four children in the same book.
        </p>
        <ChildDetailsForm track={track} />
      </section>
    </div>
  );
}
