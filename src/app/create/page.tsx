import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChildDetailsForm } from "@/components/child-details-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { withAlpha } from "@/lib/color";
import { BRAND_IMAGE_SIZE, tileSrc } from "@/lib/brand-art";
import { createHrefForLaunchTrack } from "@/lib/track-links";
import {
  customerFacingTracks,
  getTrackBySlug,
  isLaunchTrack,
  launchTrack,
} from "@/lib/tracks";

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
    redirect(createHrefForLaunchTrack());
  }

  const track = getTrackBySlug(slug);
  if (!track || !isLaunchTrack(track.slug)) {
    return <ThemeComingSoon requestedName={track?.name ?? null} />;
  }

  const switcherTracks = customerFacingTracks();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
      <aside className="h-fit space-y-6">
        <div className="relative overflow-hidden rounded-[28px] border border-ink/10 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_32px_-24px_rgba(36,28,22,0.5)]">
          <div className="relative aspect-[5/3]">
            <Image
              src={tileSrc(track.slug)}
              alt=""
              fill
              sizes="(min-width: 1024px) 22rem, 92vw"
              className="object-cover object-[50%_30%]"
            />
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
              <h1 className="mt-1 font-display text-[2rem] font-bold leading-none text-[#fffaf4]">
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

        {switcherTracks.length > 1 ? (
          <ThemeSwitcher tracks={switcherTracks} selectedSlug={track.slug} />
        ) : null}
      </aside>

      <section className="paper-grain relative rounded-[28px] border border-rule bg-cream/85 p-6 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_32px_-28px_rgba(36,28,22,0.4)] sm:p-8">
        <ChildDetailsForm track={track} />
      </section>
    </div>
  );
}

function ThemeComingSoon({ requestedName }: { requestedName: string | null }) {
  const alphabet = launchTrack();

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-16 sm:py-20">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
        Coming later
      </p>
      <h1 className="mt-3 text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">
        {requestedName ? `${requestedName} is coming soon` : "That theme is coming soon"}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        We&apos;re launching with the Alphabet book first. Other themes will
        join the shelf in a later round.
      </p>
      {alphabet ? (
        <div className="mt-8 overflow-hidden rounded-[24px] border border-ink/10">
          <Image
            src={tileSrc(alphabet.slug)}
            alt=""
            width={BRAND_IMAGE_SIZE.tile.width}
            height={BRAND_IMAGE_SIZE.tile.height}
            sizes="36rem"
            className="aspect-[16/10] w-full object-cover object-[50%_28%]"
          />
        </div>
      ) : null}
      <Link
        href={createHrefForLaunchTrack()}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark"
      >
        Personalize the Alphabet book
      </Link>
    </div>
  );
}
