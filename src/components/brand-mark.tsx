/** Open-book mark used in the header, footer, and favicon-adjacent places. */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="10" fill="var(--coral)" />
      <path
        d="M8 11c3.6-1.6 7.2-.5 9.6 1.6 2.4-2.1 6-3.2 9.6-1.6v14.4c-3.6-1.3-7.2-.2-9.6 1.8-2.4-2-6-3.1-9.6-1.8V11Z"
        fill="var(--cream)"
      />
      <path
        d="M17.6 13v14.4"
        stroke="var(--coral)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 15.2c1.8-.5 3.6-.2 5 .8M20.2 16c1.5-1 3.3-1.3 5.2-.8"
        stroke="var(--coral)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/** Icon + wordmark lockup for the site header and footer. */
export function SiteLogo({
  subtitle = false,
}: {
  subtitle?: boolean;
}) {
  return (
    <>
      <BrandMark />
      <span className="flex flex-col justify-center leading-none">
        <span className="font-display text-[1.2rem] tracking-[-0.03em] text-ink">
          Story Kiddo
        </span>
        {subtitle ? (
          <span className="mt-1 hidden text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-soft sm:block">
            Custom Books
          </span>
        ) : null}
      </span>
    </>
  );
}
