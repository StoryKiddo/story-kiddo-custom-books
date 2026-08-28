import Link from "next/link";
import { SiteLogo } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-10 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 no-underline"
          aria-label="Story Kiddo home"
        >
          <SiteLogo />
        </Link>
        <div className="flex flex-col gap-2 sm:items-end">
          <p>Stories that grow with your child.</p>
          <p>
            <Link
              href="/tracks"
              className="underline decoration-coral/50 underline-offset-4 hover:text-ink"
            >
              Browse educational tracks
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
