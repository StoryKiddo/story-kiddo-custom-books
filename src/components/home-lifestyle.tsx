/**
 * Real-life Alphabet photographs on the homepage. Copy and crops stay honest:
 * no ratings, no delivery claims, and nothing painted over faces or books.
 */

import Image from "next/image";
import Link from "next/link";
import { BRAND_IMAGE_SIZE, LIFESTYLE } from "@/lib/brand-art";
import { createHrefForLaunchTrack } from "@/lib/track-links";

const SIZE = BRAND_IMAGE_SIZE.lifestyle;

export function GiftMomentSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:pb-20 sm:pt-12">
      <div className="mb-8 max-w-2xl sm:mb-10">
        <h2 className="text-3xl tracking-tight text-ink sm:text-4xl">
          The gift where they are the story.
        </h2>
        <p className="mt-3 text-ink-soft">
          Hand them a hardcover Alphabet book with their name lettered on the
          cover — from a parent, or from the whole family.
        </p>
        <p className="mt-5">
          <Link
            href={createHrefForLaunchTrack()}
            className="inline-flex rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_22px_-10px_rgba(171,71,40,0.8)] transition hover:bg-coral-dark"
          >
            Make their Alphabet book
          </Link>
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <LifestylePhoto
          src={LIFESTYLE.momGives.src}
          alt={LIFESTYLE.momGives.alt}
          sizes="(min-width: 1024px) 40rem, 92vw"
          objectPosition="50% 42%"
          caption="The moment they see their name on the cover."
        />
        <LifestylePhoto
          src={LIFESTYLE.grandparentsGive.src}
          alt={LIFESTYLE.grandparentsGive.alt}
          sizes="(min-width: 1024px) 28rem, 92vw"
          objectPosition="50% 40%"
          caption="A family gift they open together."
        />
      </div>
    </section>
  );
}

export function ProductStorySection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:pb-20">
      <div className="mb-8 max-w-2xl sm:mb-10">
        <h2 className="text-3xl tracking-tight text-ink sm:text-4xl">
          Read it together.
        </h2>
        <p className="mt-3 text-ink-soft">
          A personalized hardcover, made to order — pages you can turn, on the
          sofa or at bedtime.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
        <LifestylePhoto
          src={LIFESTYLE.parentChild.src}
          alt={LIFESTYLE.parentChild.alt}
          sizes="(min-width: 1024px) 28rem, (min-width: 640px) 45vw, 92vw"
          objectPosition="58% 42%"
          caption="On the sofa, with the book in their lap."
        />
        <LifestylePhoto
          src={LIFESTYLE.bedtime.src}
          alt={LIFESTYLE.bedtime.alt}
          sizes="(min-width: 1024px) 28rem, (min-width: 640px) 45vw, 92vw"
          objectPosition="48% 40%"
          caption="A bedtime story with their name in it."
        />
      </div>

      <div className="mt-5 lg:mt-6">
        <LifestylePhoto
          src={LIFESTYLE.hands.src}
          alt={LIFESTYLE.hands.alt}
          sizes="(min-width: 1024px) 70rem, 92vw"
          objectPosition="46% 50%"
          caption="Pages of a personalized Alphabet hardcover."
        />
      </div>
    </section>
  );
}

function LifestylePhoto({
  src,
  alt,
  sizes,
  objectPosition,
  caption,
}: {
  src: string;
  alt: string;
  sizes: string;
  objectPosition: string;
  caption: string;
}) {
  return (
    <figure className="overflow-hidden rounded-[28px] border border-ink/10 bg-cream shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_32px_-24px_rgba(35,26,19,0.45)]">
      <Image
        src={src}
        alt={alt}
        width={SIZE.width}
        height={SIZE.height}
        sizes={sizes}
        className="aspect-[3/2] w-full object-cover"
        style={{ objectPosition }}
      />
      <figcaption className="px-4 py-3 text-sm text-ink-soft sm:px-5">{caption}</figcaption>
    </figure>
  );
}
