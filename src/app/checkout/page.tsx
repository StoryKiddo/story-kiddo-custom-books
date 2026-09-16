import type { Metadata } from "next";
import Link from "next/link";
import { previewHrefFromCheckoutQuery } from "@/lib/checkout-order";

export const metadata: Metadata = {
  title: "Checkout coming soon",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const previewHref = previewHrefFromCheckoutQuery(query);

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-16 sm:py-20">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
        Checkout
      </p>
      <h1 className="mt-3 text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">
        Checkout coming soon
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Ordering and payment are not available yet. Nothing has been charged,
        reserved, or purchased. You can return to your book preview any time.
      </p>
      {previewHref ? (
        <p className="mt-6 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          Your preview is still saved. We&apos;ll add ordering here in a later
          step — no payment form lives on this page yet.
        </p>
      ) : (
        <p className="mt-6 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          If you just created a book, open it from the confirmation link we
          showed after checkout is ready. For now you can open the Alphabet book
          or go home.
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {previewHref ? (
          <Link
            href={previewHref}
            className="inline-flex items-center justify-center rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark"
          >
            Back to your preview
          </Link>
        ) : null}
        <Link
          href="/themes"
          className="inline-flex items-center justify-center rounded-full border border-ink/12 bg-cream/80 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream"
        >
          Browse Alphabet
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-2 py-3 text-sm font-semibold text-ink-soft underline decoration-coral/40 underline-offset-4 transition hover:text-ink"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
