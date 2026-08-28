/**
 * Decorative field behind the homepage hero: a faint open-book watermark,
 * scattered stars, and a few storybook dots. Purely visual — no interaction.
 */
export function HeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -left-24 -top-28 h-[26rem] w-[26rem] rounded-full bg-coral/[0.11] blur-3xl" />
      <div className="absolute -right-20 top-8 h-[22rem] w-[22rem] rounded-full bg-gold/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-40 w-[28rem] -translate-x-1/2 rounded-full bg-sage/[0.08] blur-3xl" />

      <svg
        className="absolute left-[-8%] top-[12%] h-[420px] w-[420px] text-ink/[0.045]"
        viewBox="0 0 420 280"
        fill="none"
      >
        <path
          d="M40 48c70-22 130 4 170 38 40-34 100-60 170-38v176c-70-18-130 6-170 40-40-34-100-58-170-40V48Z"
          stroke="currentColor"
          strokeWidth="10"
        />
        <path d="M210 86 v178" stroke="currentColor" strokeWidth="6" />
      </svg>

      <svg
        className="absolute inset-0 h-full w-full text-gold"
        viewBox="0 0 1200 640"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.55">
          <path
            d="M140 92l4.2 8.8 9.8 1.2-7.2 6.8 1.9 9.6L140 114l-8.7 4.4 1.9-9.6-7.2-6.8 9.8-1.2Z"
            fill="currentColor"
          />
          <path
            d="M1080 128l3.4 7.2 8 1-5.9 5.5 1.6 7.8L1080 146l-7.1 3.5 1.6-7.8-5.9-5.5 8-1Z"
            fill="currentColor"
          />
          <path
            d="M980 480l3.4 7.2 8 1-5.9 5.5 1.6 7.8L980 498l-7.1 3.5 1.6-7.8-5.9-5.5 8-1Z"
            fill="currentColor"
          />
          <path
            d="M220 500l2.8 5.8 6.5.8-4.8 4.5 1.3 6.4L220 514l-5.8 2.9 1.3-6.4-4.8-4.5 6.5-.8Z"
            fill="currentColor"
          />
          <circle cx="90" cy="240" r="3" fill="var(--coral)" opacity="0.7" />
          <circle cx="1120" cy="300" r="2.5" fill="var(--coral)" opacity="0.65" />
          <circle cx="640" cy="72" r="2.2" fill="currentColor" />
          <circle cx="520" cy="560" r="2.4" fill="var(--coral)" opacity="0.5" />
          <circle cx="860" cy="88" r="1.8" fill="currentColor" />
          <circle cx="70" cy="430" r="1.6" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
