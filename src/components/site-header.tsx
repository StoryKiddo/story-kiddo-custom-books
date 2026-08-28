import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/tracks", label: "Tracks" },
];

/** Top bar used on every page. Kept as a Server Component — no client JS. */
export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <BrandMark />
          <span className="font-display text-lg tracking-tight text-ink">
            Story Kiddo
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-ink-soft">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 transition hover:bg-paper-deep hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/tracks"
            className="ml-2 rounded-full bg-coral px-4 py-1.5 text-white shadow-[2px_2px_0_0_#b54e35] transition hover:bg-coral-dark"
          >
            Create a book
          </Link>
        </nav>
      </div>
    </header>
  );
}
