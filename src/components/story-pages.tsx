/** Read-aloud story pages on the order confirmation screen.
 *  Before payment we only show the first seven pages (or fewer if the book is shorter).
 */

import { illustrationSlot } from "@/lib/illustration-prompt";
import { PREVIEW_STORY_PAGE_COUNT } from "@/lib/personalization";

export type StoryPageView = {
  text: string;
  imageUrl?: string | null;
};

export function StoryPages({
  pages,
  illustrating = false,
}: {
  pages: StoryPageView[];
  illustrating?: boolean;
}) {
  return (
    <section className="mt-10 space-y-5">
      <h2 className="text-2xl tracking-tight text-ink">Your story</h2>
      {illustrating ? (
        <p className="rounded-2xl border border-rule bg-cream/80 px-5 py-4 text-sm text-ink-soft">
          A couple of preview pictures are being painted&hellip;
        </p>
      ) : null}
      <ol className="space-y-5">
        {pages.slice(0, PREVIEW_STORY_PAGE_COUNT).map((page, index) => {
          const slot = illustrationSlot(index, Boolean(page.imageUrl), illustrating);
          return (
          <li
            key={index}
            className="rounded-[28px] border border-rule bg-cream/80 p-6 shadow-[0_10px_24px_-16px_rgba(36,28,22,0.18)] sm:p-8"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage">
              Page {index + 1}
            </p>
            {slot === "image" ? (
              // Signed storage URLs are short-lived and private; a plain img avoids next/image host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.imageUrl ?? ""}
                alt={`Preview illustration for page ${index + 1}`}
                className="mt-4 w-full rounded-2xl border border-rule bg-paper-deep object-cover"
              />
            ) : null}
            {slot === "loading" ? (
              <p className="mt-4 rounded-2xl bg-paper-deep/60 px-4 py-8 text-center text-sm text-ink-soft">
                Painting this preview&hellip;
              </p>
            ) : null}
            <p className="mt-3 font-display text-xl leading-relaxed whitespace-pre-line text-ink">
              {page.text}
            </p>
          </li>
          );
        })}
      </ol>
    </section>
  );
}
