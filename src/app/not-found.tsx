import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-5 py-24">
      <h1 className="text-4xl text-ink">We couldn&apos;t find that page.</h1>
      <p className="text-ink-soft">
        If you were creating a book, start by choosing an educational track.
      </p>
      <Link
        href="/tracks"
        className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[2px_2px_0_0_#b54e35]"
      >
        Browse tracks
      </Link>
    </div>
  );
}
