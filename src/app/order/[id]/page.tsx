import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackIcon } from "@/components/track-icon";
import { getOrderSummary } from "@/lib/orders";

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

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage sm:text-xs">
        Order received
      </p>
      <h1 className="mt-3 text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl">{order.bookTitle}</h1>
      <p className="mt-3 text-lg text-ink-soft">
        {order.childName}, age {order.childAge}, is the star of this{" "}
        {order.track.name.toLowerCase()} story.
      </p>

      <div
        className="mt-10 flex items-start gap-4 rounded-[28px] p-6"
        style={{ background: order.track.cover }}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/60">
          <TrackIcon slug={order.track.slug} ink={order.track.ink} />
        </div>
        <div>
          <p className="font-display text-xl text-ink">{order.track.name}</p>
          <p className="text-sm text-ink/80">{order.track.tagline}</p>
          <p className="mt-2 font-mono text-xs text-ink-soft">
            Order {order.id}
          </p>
        </div>
      </div>

      {order.isDemo ? (
        <p className="mt-8 rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          This order was not saved to Supabase. Add the keys from{" "}
          <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">.env.example</code>{" "}
          to <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">.env.local</code>{" "}
          and run the SQL in <code className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">supabase/migrations/</code>{" "}
          to store customers, orders, photos, and books.
        </p>
      ) : (
        <p className="mt-8 text-sm text-ink-soft">
          We saved this order and a pending book. Illustrated pages are not
          generated yet — that comes in a later step.
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/tracks"
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark"
        >
          Create another book
        </Link>
        <Link
          href="/"
          className="rounded-full border border-ink/12 bg-cream/80 px-6 py-3 text-sm font-semibold text-ink"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
