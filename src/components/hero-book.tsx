/** Decorative open storybook used in the homepage hero. */
export function HeroBook() {
  return (
    <svg
      viewBox="0 0 420 280"
      role="img"
      aria-label="An open picture book with a child on the page"
      className="h-auto w-full max-w-lg drop-shadow-[0_18px_32px_rgba(36,28,22,0.12)]"
    >
      <ellipse cx="210" cy="258" rx="150" ry="14" fill="#241c16" opacity="0.08" />
      <path
        d="M40 48c70-22 130 4 170 38 40-34 100-60 170-38v176c-70-18-130 6-170 40-40-34-100-58-170-40V48Z"
        fill="#f3e6d4"
      />
      <path
        d="M40 48c70-22 130 4 170 38v178c-40-34-100-58-170-40V48Z"
        fill="#fffaf4"
      />
      <path
        d="M210 86c40-34 100-60 170-38v176c-70-18-130 6-170 40V86Z"
        fill="#eadcc8"
      />
      <path d="M210 86 v178" stroke="#d96b4f" strokeWidth="3" />
      <circle cx="118" cy="128" r="28" fill="#f0c4b0" />
      <circle cx="118" cy="118" r="18" fill="#e3ad96" />
      <rect x="96" y="148" width="44" height="52" rx="16" fill="#d96b4f" />
      <rect x="248" y="118" width="72" height="10" rx="5" fill="#cfe0c8" />
      <rect x="248" y="140" width="92" height="8" rx="4" fill="#e4d5c0" />
      <rect x="248" y="158" width="80" height="8" rx="4" fill="#e4d5c0" />
      <rect x="248" y="176" width="64" height="8" rx="4" fill="#e4d5c0" />
      <circle cx="300" cy="214" r="16" fill="#e8d09a" />
    </svg>
  );
}
