/** Read-aloud story pages on the order confirmation screen. */
export function StoryPages({ pages }: { pages: string[] }) {
  return (
    <section className="mt-10 space-y-5">
      <h2 className="text-2xl tracking-tight text-ink">Your story</h2>
      <ol className="space-y-5">
        {pages.map((page, index) => (
          <li
            key={index}
            className="rounded-[28px] border border-rule bg-cream/80 p-6 shadow-[0_10px_24px_-16px_rgba(36,28,22,0.18)] sm:p-8"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage">
              Page {index + 1}
            </p>
            <p className="mt-3 font-display text-xl leading-relaxed text-ink">{page}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
