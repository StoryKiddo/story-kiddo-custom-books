/** Tiny open-book mark used in the header and favicon-adjacent places. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#d96b4f" />
      <path
        d="M7.5 9.5c3.2-1.4 6.4-.4 8.5 1.4 2.1-1.8 5.3-2.8 8.5-1.4v13c-3.2-1.2-6.4-.2-8.5 1.6-2.1-1.8-5.3-2.8-8.5-1.6v-13Z"
        fill="#fbf4ea"
      />
      <path
        d="M16 11.2v12.4"
        stroke="#d96b4f"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
