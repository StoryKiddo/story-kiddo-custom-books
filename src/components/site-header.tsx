import Link from "next/link";
import { SiteLogo } from "@/components/brand-mark";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/tracks", label: "Tracks" },
];

/** Top bar used on every page. Kept as a Server Component — no client JS. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:gap-6 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 no-underline"
          aria-label="Story Kiddo home"
        >
          <SiteLogo subtitle />
        </Link>
        <nav className="flex items-center gap-0.5 text-sm font-semibold text-ink-soft sm:gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-2.5 py-1.5 transition hover:bg-paper-deep hover:text-ink sm:px-3 ${
                item.href === "/" ? "hidden sm:inline" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/tracks"
            className="ml-1 rounded-full bg-coral px-3.5 py-1.5 text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_16px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark sm:ml-2 sm:px-4"
          >
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create a book</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
