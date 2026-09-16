import Link from "next/link";
import { notFound } from "next/navigation";
import { BookInProgress } from "@/components/book-in-progress";
import { OrderCover } from "@/components/order-cover";
import { RefreshWhileGenerating } from "@/components/refresh-while-generating";
import { StoryPages } from "@/components/story-pages";
import { checkoutHref } from "@/lib/checkout-order";
import { withAlpha } from "@/lib/color";
import { formatOrderNumberLabel } from "@/lib/order-number";
import { formatStarsLine, getOrderSummary } from "@/lib/orders";
import { THEME_GALLERY_HREF } from "@/lib/track-links";

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
  const stillWorking = illustrating || waitingOnStory;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <OrderCover
          track={order.track}
          title={order.bookTitle}
          coverUrl={order.coverUrl}
          pending={stillWorking}
        />

        <div className="lg:pt-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
            Order received
          </p>
          <h1 className="mt-3 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[2.6rem]">
            {order.bookTitle}
          </h1>
          {order.bookSubtitle ? (
            <p className="mt-2 text-lg text-ink-soft">{order.bookSubtitle}</p>
          ) : null}
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">
            {formatStarsLine(order.children, order.track.name)}
          </p>

          <div
            className="paper-grain relative mt-7 overflow-hidden rounded-[24px] px-6 py-5"
            style={{
              background: `linear-gradient(140deg, ${order.track.art.skyTop}, ${order.track.cover})`,
              boxShadow: `0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px ${withAlpha(
                order.track.art.accent,
                0.45,
              )}`,
            }}
          >
            <p
              className="font-display text-xl font-bold"
              style={{ color: order.track.art.deep }}
            >
              {order.track.name}
            </p>
            <p className="text-sm text-ink/80">{order.track.tagline}</p>
            <p className="mt-3 font-mono text-xs text-ink-soft">
              {formatOrderNumberLabel(order.orderNumber)}
            </p>
          </div>

          <Link
            href={checkoutHref({
              id: order.id,
              isDemo: order.isDemo,
              trackSlug: order.track.slug,
              children: order.children,
            })}
            className="mt-7 flex w-full items-center justify-center rounded-full bg-coral px-6 py-4 text-center text-base font-semibold tracking-[0.16em] text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark sm:py-5 sm:text-lg"
          >
            BRING TO LIFE
          </Link>
        </div>
      </div>

      {order.isDemo ? (
        <p className="mt-10 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          This order was not saved to Supabase. Add the keys from{" "}
          <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">.env.example</code>{" "}
          to <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">.env.local</code>{" "}
          and run the SQL in <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">supabase/migrations/</code>{" "}
          to store customers, orders, photos, and books.
        </p>
      ) : storyPages ? (
        <>
          {stillWorking ? (
            <>
              <RefreshWhileGenerating orderId={order.id} />
              <BookInProgress
                status={order.bookStatus}
                track={order.track}
                childName={order.children[0]?.name ?? "your child"}
                startedAtIso={order.createdAt}
              />
            </>
          ) : null}
          {order.bookStatus === "failed" && !order.illustrationUrls?.some(Boolean) ? (
            <p className="mt-10 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
              Your order was saved! Your story is ready below. We&apos;re still
              finishing the pictures — check back in a moment.
            </p>
          ) : null}
          <StoryPages pages={storyPages} track={order.track} illustrating={illustrating} />
        </>
      ) : order.bookStatus === "failed" ? (
        <p className="mt-10 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          Your order was saved! We&apos;re finishing up your story — check back
          in a moment.
        </p>
      ) : (
        <>
          {waitingOnStory ? <RefreshWhileGenerating orderId={order.id} /> : null}
          <BookInProgress
            status={order.bookStatus}
            track={order.track}
            childName={order.children[0]?.name ?? "your child"}
            startedAtIso={order.createdAt}
          />
        </>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          href={THEME_GALLERY_HREF}
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
