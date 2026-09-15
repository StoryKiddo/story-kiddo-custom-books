/**
 * The illustration behind every theme: a cut-paper landscape painted in that
 * theme's palette, with a motif that says what the book teaches.
 *
 * Drawn as inline SVG over a CSS sky gradient, so no gradient ids are needed
 * and the same scene can appear many times on one page (tiles, covers, hero)
 * without id collisions.
 */

import type { Track, TrackArt } from "@/lib/tracks";

export function ThemeArt({
  track,
  className = "",
  portrait = false,
}: {
  track: Pick<Track, "slug" | "art">;
  className?: string;
  /** Pulls the motif toward the middle so a tall crop (a cover) keeps all of it. */
  portrait?: boolean;
}) {
  const art = track.art;
  return (
    <div
      aria-hidden="true"
      className={`paper-grain relative h-full w-full overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(176deg, ${art.skyTop} 0%, ${art.skyBottom} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <g transform={portrait ? "translate(200 90) scale(0.6) translate(-200 -90)" : undefined}>
          <Sky art={art} />
        </g>
        <HillsBack art={art} />
        <g transform={portrait ? "translate(200 205) scale(0.68) translate(-200 -205)" : undefined}>
          <Motif slug={track.slug} art={art} />
        </g>
        <HillsFront art={art} />
        <Sprigs art={art} />
      </svg>
    </div>
  );
}

function Sky({ art }: { art: TrackArt }) {
  return (
    <g>
      <circle cx="332" cy="58" r="34" fill={art.accent} opacity="0.55" />
      <circle cx="332" cy="58" r="23" fill={art.accent} opacity="0.9" />
      <g fill="#ffffff" opacity="0.55">
        <path d="M34 78c-10 0-18-6-18-14s8-14 18-14c3-9 12-14 22-12 8 1 14 7 16 14 9 1 16 7 16 13 0 7-8 13-18 13H34Z" />
        <path d="M262 40c-7 0-13-4-13-10s6-10 13-10c2-6 9-10 16-9 6 1 10 5 11 10 7 1 12 5 12 9 0 5-6 10-13 10h-26Z" />
      </g>
      <g fill="#ffffff" opacity="0.4">
        <circle cx="112" cy="34" r="3.2" />
        <circle cx="180" cy="66" r="2.2" />
        <circle cx="368" cy="122" r="2.6" />
      </g>
    </g>
  );
}

/** The far ridge, painted behind the motif so the scene has depth. */
function HillsBack({ art }: { art: TrackArt }) {
  return (
    <path
      d="M0 214c46-26 84-24 122-6 40 19 74 20 112 2 34-16 76-16 166 6v88H0v-90Z"
      fill={art.hillFar}
    />
  );
}

/** The near meadow, painted in front so motifs stand in the grass. */
function HillsFront({ art }: { art: TrackArt }) {
  return (
    <g>
      <path
        d="M0 244c56-24 104-22 148-2 38 17 80 16 122-2 32-13 76-13 130 4v56H0v-56Z"
        fill={art.hillNear}
      />
      <g fill="#ffffff" opacity="0.13">
        <ellipse cx="72" cy="266" rx="30" ry="6" />
        <ellipse cx="308" cy="276" rx="38" ry="7" />
      </g>
    </g>
  );
}

/** Grass tufts and a couple of flowers so the meadow is not a flat band. */
function Sprigs({ art }: { art: TrackArt }) {
  return (
    <g>
      <g
        stroke={art.deep}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.18"
        fill="none"
      >
        <path d="M28 272c-1-8 1-13 4-16M28 272c1-7 4-11 8-13M28 272c-4-5-8-7-12-7" />
        <path d="M348 268c-1-8 1-13 4-16M348 268c1-7 4-11 8-13M348 268c-4-5-8-7-12-7" />
        <path d="M212 280c-1-7 1-11 4-14M212 280c1-6 4-9 8-11" />
      </g>
      <g opacity="0.5">
        <path d="M108 276v-12" stroke={art.deep} strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        <circle cx="108" cy="262" r="3.4" fill={art.accent} />
        <path d="M276 284v-11" stroke={art.deep} strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        <circle cx="276" cy="271" r="3" fill="#ffffff" opacity="0.8" />
      </g>
    </g>
  );
}

function Motif({ slug, art }: { slug: string; art: TrackArt }) {
  switch (slug) {
    case "alphabet":
      return <AlphabetMotif art={art} />;
    case "numbers":
      return <NumbersMotif art={art} />;
    case "colors-shapes":
      return <ShapesMotif art={art} />;
    case "emotions":
      return <EmotionsMotif art={art} />;
    case "kindness-values":
      return <KindnessMotif art={art} />;
    case "life-milestones":
      return <MilestonesMotif art={art} />;
    case "animals-nature":
      return <NatureMotif art={art} />;
    case "manners":
      return <MannersMotif art={art} />;
    default:
      return null;
  }
}

const BLOCK_LETTERS = ["A", "b", "C"];

function AlphabetMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      {/* A kite trailing letter bows. */}
      <g transform="translate(96 64) rotate(-12)">
        <path d="M0 -30 26 0 0 34 -26 0Z" fill={art.accent} />
        <path d="M0 -30 0 34M-26 0 26 0" stroke="#ffffff" strokeWidth="2" opacity="0.65" />
        <path d="M0 34c10 12-10 18 0 30s-8 16-2 26" stroke={art.deep} strokeWidth="2" fill="none" opacity="0.5" />
      </g>
      {BLOCK_LETTERS.map((letter, index) => (
        <g
          key={letter}
          transform={`translate(${168 + index * 60} ${216 - index * 6}) rotate(${(index - 1) * 5})`}
        >
          <rect x="-26" y="-26" width="52" height="52" rx="12" fill="#fffaf4" opacity="0.95" />
          <rect x="-26" y="-26" width="52" height="52" rx="12" fill="none" stroke={art.deep} strokeWidth="2" opacity="0.28" />
          <text
            x="0"
            y="12"
            textAnchor="middle"
            fontSize="34"
            fontWeight="700"
            fontFamily="Georgia, 'Times New Roman', serif"
            fill={art.deep}
          >
            {letter}
          </text>
        </g>
      ))}
    </g>
  );
}

function NumbersMotif({ art }: { art: TrackArt }) {
  const balloons = [
    { x: 108, y: 150, r: 30, label: "1" },
    { x: 196, y: 112, r: 24, label: "2" },
    { x: 268, y: 160, r: 20, label: "3" },
  ];
  return (
    <g>
      {balloons.map((balloon) => (
        <g key={balloon.label}>
          <path
            d={`M${balloon.x} ${balloon.y + balloon.r} v${balloon.r * 1.1}`}
            stroke={art.deep}
            strokeWidth="1.8"
            opacity="0.4"
          />
          <circle cx={balloon.x} cy={balloon.y} r={balloon.r} fill="#fffaf4" opacity="0.95" />
          <circle
            cx={balloon.x}
            cy={balloon.y}
            r={balloon.r}
            fill="none"
            stroke={art.deep}
            strokeWidth="2"
            opacity="0.25"
          />
          <path
            d={`M${balloon.x - balloon.r} ${balloon.y} a${balloon.r} ${balloon.r} 0 0 1 ${balloon.r} -${balloon.r}`}
            stroke={art.accent}
            strokeWidth="5"
            fill="none"
            opacity="0.75"
          />
          <text
            x={balloon.x}
            y={balloon.y + balloon.r * 0.36}
            textAnchor="middle"
            fontSize={balloon.r * 1.15}
            fontWeight="700"
            fontFamily="Georgia, 'Times New Roman', serif"
            fill={art.deep}
          >
            {balloon.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function ShapesMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      <g fill="none" strokeLinecap="round">
        <path d="M84 232a116 116 0 0 1 232 0" stroke={art.accent} strokeWidth="15" opacity="0.7" />
        <path d="M106 232a94 94 0 0 1 188 0" stroke="#fffaf4" strokeWidth="15" opacity="0.8" />
        <path d="M128 232a72 72 0 0 1 144 0" stroke={art.hillNear} strokeWidth="15" opacity="0.8" />
      </g>
      <circle cx="132" cy="196" r="24" fill={art.hillNear} />
      <circle cx="132" cy="196" r="24" fill="none" stroke="#fffaf4" strokeWidth="3" opacity="0.7" />
      <rect x="182" y="176" width="44" height="44" rx="9" fill={art.accent} />
      <rect x="182" y="176" width="44" height="44" rx="9" fill="none" stroke="#fffaf4" strokeWidth="3" opacity="0.7" />
      <path d="M270 174 296 220 244 220Z" fill="#fffaf4" />
      <path d="M270 174 296 220 244 220Z" fill="none" stroke={art.deep} strokeWidth="2.6" opacity="0.3" />
    </g>
  );
}

function EmotionsMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      {/* A sun that grins and a small cloud having a wobbly day. */}
      <g transform="translate(142 148)">
        <circle r="44" fill="#fffaf4" opacity="0.95" />
        <circle r="44" fill="none" stroke={art.deep} strokeWidth="2" opacity="0.22" />
        <circle cx="-15" cy="-8" r="4.2" fill={art.deep} />
        <circle cx="15" cy="-8" r="4.2" fill={art.deep} />
        <path
          d="M-18 12c7 11 29 11 36 0"
          stroke={art.deep}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="-28" cy="8" r="7" fill={art.accent} opacity="0.55" />
        <circle cx="28" cy="8" r="7" fill={art.accent} opacity="0.55" />
      </g>
      <g transform="translate(266 138)">
        <path
          d="M-30 14c-8 0-14-6-14-13s6-13 14-13c3-8 11-13 19-11 7 2 12 7 13 13 7 1 13 6 13 12 0 7-7 12-15 12h-30Z"
          fill="#fffaf4"
          opacity="0.92"
        />
        <circle cx="-8" cy="2" r="3" fill={art.deep} opacity="0.8" />
        <circle cx="8" cy="2" r="3" fill={art.deep} opacity="0.8" />
        <path d="M-7 12c5-5 12-5 16 0" stroke={art.deep} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M2 26c5 7 5 12 0 14s-6-7 0-14Z" fill={art.hillNear} opacity="0.8" />
      </g>
    </g>
  );
}

function KindnessMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      <Child art={art} x={150} y={196} scale={1} />
      <Child art={art} x={252} y={200} scale={0.92} flip />
      <g transform="translate(201 168)">
        <path
          d="M0 20s-20-12-20-27C-20-16-12-21-6-18-3-16-1-13 0-11c1-2 3-5 6-7 6-3 14 2 14 11C20 8 0 20 0 20Z"
          fill={art.accent}
        />
        <path
          d="M0 20s-20-12-20-27C-20-16-12-21-6-18-3-16-1-13 0-11c1-2 3-5 6-7 6-3 14 2 14 11C20 8 0 20 0 20Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.6"
        />
      </g>
    </g>
  );
}

function MilestonesMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      {/* A stepping-stone path up to a little front door. */}
      <path
        d="M186 300c6-34 16-50 30-64 12-12 20-24 22-42"
        stroke="#fffaf4"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        strokeDasharray="2 22"
      />
      <g transform="translate(248 150)">
        <path d="M-40 6 0-30 40 6v52h-80Z" fill="#fffaf4" opacity="0.95" />
        <path d="M-44 8 0-32 44 8" stroke={art.deep} strokeWidth="3.4" fill="none" opacity="0.35" strokeLinejoin="round" />
        <rect x="-12" y="20" width="24" height="38" rx="6" fill={art.hillNear} />
        <circle cx="6" cy="40" r="2.4" fill={art.accent} />
        <rect x="-34" y="18" width="16" height="14" rx="3" fill={art.accent} opacity="0.85" />
      </g>
      <path
        d="M112 96l5.4 11.4L130 109l-9 8.8 2.4 12.4L112 124l-11.4 6.2 2.4-12.4-9-8.8 12.6-1.6Z"
        fill="#fffaf4"
        opacity="0.9"
      />
    </g>
  );
}

function NatureMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      <g transform="translate(122 168)">
        <path d="M0 74V16" stroke={art.deep} strokeWidth="9" strokeLinecap="round" opacity="0.55" />
        <circle cx="0" cy="-8" r="42" fill="#fffaf4" opacity="0.9" />
        <circle cx="-26" cy="14" r="24" fill="#fffaf4" opacity="0.8" />
        <circle cx="26" cy="12" r="26" fill="#fffaf4" opacity="0.85" />
        <circle cx="-14" cy="-16" r="5" fill={art.accent} opacity="0.75" />
        <circle cx="16" cy="4" r="4.2" fill={art.accent} opacity="0.6" />
      </g>
      {/* A fox sitting in the grass. */}
      <g transform="translate(258 206)">
        <path d="M-34 30c4-20 14-30 26-30 14 0 24 12 26 30Z" fill={art.accent} />
        <path d="M-8-4c-4-10-2-18 4-22 5 5 8 13 7 22Z" fill={art.accent} />
        <path d="M10-6c5-9 11-14 18-13 0 7-4 14-11 19Z" fill={art.accent} />
        <circle cx="-2" cy="12" r="12" fill="#fffaf4" opacity="0.95" />
        <circle cx="-6" cy="10" r="2" fill={art.deep} />
        <circle cx="3" cy="10" r="2" fill={art.deep} />
        <path d="M-34 30c-12-2-18-8-16-16 6-4 12 0 18 8Z" fill={art.accent} opacity="0.8" />
      </g>
      <path
        d="M330 108c-8 6-16 6-22 0 6-8 14-8 22 0Z"
        fill="#fffaf4"
        opacity="0.8"
      />
    </g>
  );
}

function MannersMotif({ art }: { art: TrackArt }) {
  return (
    <g>
      <Child art={art} x={144} y={198} scale={1.02} />
      <g transform="translate(238 132)">
        <path
          d="M-46 0c0-18 20-32 46-32s46 14 46 32-20 32-46 32c-7 0-14-1-20-3l-22 9 6-19c-6-5-10-12-10-19Z"
          fill="#fffaf4"
          opacity="0.95"
        />
        <text
          x="0"
          y="8"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill={art.deep}
        >
          Hello!
        </text>
      </g>
      <g transform="translate(302 206)">
        <path d="M-24 -6h40v18a20 20 0 0 1-40 0Z" fill={art.accent} />
        <path d="M16 0h8a9 9 0 0 1 0 18h-8" fill="none" stroke={art.accent} strokeWidth="5" />
        <path d="M-28 20h48" stroke={art.deep} strokeWidth="3" opacity="0.3" strokeLinecap="round" />
        <path d="M-8-16c-4-6 2-9 0-15M4-16c-4-6 2-9 0-15" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** A child cut from paper — reused wherever the scene needs a small person. */
function Child({
  art,
  x,
  y,
  scale = 1,
  flip = false,
}: {
  art: TrackArt;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M-20 44c0-24 8-38 20-38s20 14 20 38Z" fill="#fffaf4" opacity="0.95" />
      <path d="M-20 44c0-24 8-38 20-38s20 14 20 38Z" fill={art.hillNear} opacity="0.35" />
      <circle cx="0" cy="-12" r="16" fill="#fffaf4" opacity="0.97" />
      <path d="M-16-14c0-12 7-18 16-18s16 6 16 18c-6-6-11-8-16-8s-10 2-16 8Z" fill={art.deep} opacity="0.65" />
      <circle cx="-5" cy="-10" r="2.1" fill={art.deep} />
      <circle cx="5" cy="-10" r="2.1" fill={art.deep} />
      <path d="M-5-3c3 3 7 3 10 0" stroke={art.deep} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="-11" cy="-4" r="3.4" fill={art.accent} opacity="0.5" />
      <circle cx="11" cy="-4" r="3.4" fill={art.accent} opacity="0.5" />
    </g>
  );
}
