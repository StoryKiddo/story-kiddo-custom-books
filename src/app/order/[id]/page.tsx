import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCoverPreview } from "@/components/book-cover-preview";
import { RefreshWhileGenerating } from "@/components/refresh-while-generating";
import { StoryPages } from "@/components/story-pages";
import { checkoutHref } from "@/lib/checkout-order";
import { formatOrderNumberLabel } from "@/lib/order-number";
import { formatStarsLine, getOrderSummary } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const order = await getOrderSummary(id, query);

  if (!order) {
    notFound();
  }

  const storyPages = order.pages?.map((text, index) => ({
    text,
    imageUrl: order.illustrationUrls?.[index] ?? null,
  }));
  const illustrating = order.bookStatus === "illustrating";
  const waitingOnStory =
    order.bookStatus === "generating" || order.bookStatus === "pending";
  const coverImageUrl =
    order.illustrationUrls?.find((url): url is string => Boolean(url)) ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
        Order received
      </p>
      <h1 className="mt-3 text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">
        {order.bookTitle}
      </h1>
      {order.bookSubtitle ? (
        <p className="mt-2 text-lg text-ink-soft">{order.bookSubtitle}</p>
      ) : null}
      <p className="mt-3 text-lg text-ink-soft">
        {formatStarsLine(order.children, order.track.name)}
      </p>

      <BookCoverPreview
        title={order.bookTitle}
        subtitle={order.bookSubtitle}
        track={order.track}
        imageUrl={coverImageUrl}
      />

      <div
        className="mt-8 flex items-start gap-4 rounded-[28px] p-6"
        style={{ background: order.track.cover }}
      >
        <div className="min-w-0">
          <p className="font-display text-xl text-ink">{order.track.name}</p>
          <p className="text-sm text-ink/80">{order.track.tagline}</p>
          <p className="mt-2 font-mono text-xs text-ink-soft">
            {formatOrderNumberLabel(order.orderNumber)}
          </p>
        </div>
      </div>

      <Link
        href={checkoutHref({
          id: order.id,
          isDemo: order.isDemo,
          trackSlug: order.track.slug,
          children: order.children,
        })}
        className="mt-8 flex w-full items-center justify-center rounded-full bg-coral px-6 py-4 text-center text-base font-semibold tracking-[0.16em] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark sm:py-5 sm:text-lg"
      >
        BRING TO LIFE
      </Link>

      {order.isDemo ? (
        <p className="mt-8 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          This order was not saved to Supabase. Add the keys from{" "}
          <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">.env.example</code>{" "}
          to <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">.env.local</code>{" "}
          and run the SQL in <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">supabase/migrations/</code>{" "}
          to store customers, orders, photos, and books.
        </p>
      ) : storyPages ? (
        <>
          {illustrating || waitingOnStory ? <RefreshWhileGenerating orderId={order.id} /> : null}
          {order.bookStatus === "failed" && !order.illustrationUrls?.some(Boolean) ? (
            <p className="mt-8 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
              Your order was saved! Your story is ready below. We&apos;re still
              finishing the pictures — check back in a moment.
            </p>
          ) : null}
          <StoryPages pages={storyPages} illustrating={illustrating} />
        </>
      ) : order.bookStatus === "failed" ? (
        <p className="mt-8 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          Your order was saved! We&apos;re finishing up your story — check back
          in a moment.
        </p>
      ) : (
        <>
          {waitingOnStory ? <RefreshWhileGenerating orderId={order.id} /> : null}
          <p className="mt-8 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
            Your story is being written&hellip;
          </p>
        </>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          href="/themes"
          className="font-semibold text-ink-soft underline decoration-coral/40 underline-offset-4 transition hover:text-ink"
        >
          Create another book
        </Link>
        <Link
          href="/"
          className="rounded-full border border-ink/12 bg-cream/80 px-4 py-1.5 text-sm font-semibold text-ink-soft transition hover:bg-cream hover:text-ink"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
