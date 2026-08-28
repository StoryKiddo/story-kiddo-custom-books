import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>Story Kiddo Custom Books — stories that grow with your child.</p>
        <p>
          <Link href="/tracks" className="underline decoration-coral/50 underline-offset-4 hover:text-ink">
            Browse educational tracks
          </Link>
        </p>
      </div>
    </footer>
  );
}
