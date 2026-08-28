import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-5 py-24">
      <h1 className="text-4xl text-ink">We couldn&apos;t find that page.</h1>
      <p className="text-ink-soft">
        If you were creating a book, start by choosing an educational theme.
      </p>
      <Link
        href="/themes"
        className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)]"
      >
        Browse themes
      </Link>
    </div>
  );
}
