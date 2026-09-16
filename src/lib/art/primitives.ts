/**
 * Drawing primitives for the Story Kiddo picture style.
 *
 * Everything here returns SVG markup as a string so one set of illustrations
 * can be used two ways: inlined by React components (theme tiles, story
 * panels) and rasterized by `scripts/generate-art.ts` into the cover art and
 * book mockups that ship in `public/brand/`. Shapes are drawn in a 1200-wide
 * picture space; callers position and scale them.
 *
 * Figures are sized by their finished height in picture units rather than by a
 * scale factor, so a child can be composed against a horizon without guessing.
 */

import type { TrackArt } from "../tracks.ts";

/** Rounds coordinates so the generated markup stays small and diffable. */
export function n(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function group(transform: string, body: string): string {
  return `<g transform="${transform}">${body}</g>`;
}

export function at(x: number, y: number, scale = 1, body = ""): string {
  const transform =
    scale === 1 ? `translate(${n(x)} ${n(y)})` : `translate(${n(x)} ${n(y)}) scale(${scale.toFixed(3)})`;
  return group(transform, body);
}

function channel(hex: string, index: number): number {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  return Number.parseInt(full.slice(index * 2, index * 2 + 2), 16);
}

/** Blends two hex colors. `t` of 0 is all `a`, 1 is all `b`. */
export function mix(a: string, b: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const parts = [0, 1, 2].map((i) => {
    const value = Math.round(channel(a, i) * (1 - clamped) + channel(b, i) * clamped);
    return value.toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

export function shade(hex: string, amount: number): string {
  return mix(hex, "#1b120a", amount);
}

export function tint(hex: string, amount: number): string {
  return mix(hex, "#fffaf0", amount);
}

/**
 * A soft rolling ridge across the picture.
 * `bumps` sets how many crests, `amplitude` how tall they are.
 */
export function ridge(options: {
  width: number;
  top: number;
  bottom: number;
  amplitude: number;
  bumps: number;
  phase?: number;
  fill: string;
  opacity?: number;
}): string {
  const { width, top, bottom, amplitude, bumps, phase = 0, fill, opacity = 1 } = options;
  const step = width / bumps;
  let d = `M0 ${n(top)}`;
  for (let i = 0; i < bumps; i++) {
    const x1 = i * step;
    const x2 = (i + 1) * step;
    const lift = amplitude * Math.sin(phase + i * 1.7);
    d += ` C ${n(x1 + step * 0.35)} ${n(top + lift - amplitude * 0.8)}, ${n(x2 - step * 0.35)} ${n(
      top - lift + amplitude * 0.6,
    )}, ${n(x2)} ${n(top + lift * 0.4)}`;
  }
  d += ` L ${n(width)} ${n(bottom)} L 0 ${n(bottom)} Z`;
  return `<path d="${d}" fill="${fill}"${opacity === 1 ? "" : ` opacity="${opacity}"`}/>`;
}

export function cloud(x: number, y: number, scale: number, opacity = 0.9): string {
  return at(
    x,
    y,
    scale,
    `<path d="M-72 22c-21 0-38-14-38-31s17-31 38-31c8-19 29-30 50-25 18 4 31 18 34 36 19 2 33 15 33 30 0 17-16 21-37 21z" fill="#ffffff" opacity="${opacity}"/>` +
      `<path d="M-64 22c-14 0-25-9-25-20 0-7 4-13 10-17 10 6 24 9 39 9 17 0 32-4 42-11 5 4 8 10 8 16 0 12-11 23-26 23z" fill="#ffffff" opacity="${(
        opacity * 0.45
      ).toFixed(2)}"/>`,
  );
}

/** The sun with a warm halo behind it. */
export function sunDisc(x: number, y: number, r: number, art: TrackArt, uid: string): string {
  return (
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 2.3)}" fill="url(#${uid}-glow)"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${art.warm}"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.78)}" fill="#fff8e2" opacity="0.6"/>`
  );
}

export function birds(x: number, y: number, scale: number, color: string): string {
  const wing = (dx: number, dy: number, s: number) =>
    `<path d="M${n(dx - 15 * s)} ${n(dy)}c${n(6 * s)} ${n(-7 * s)} ${n(10 * s)} ${n(-7 * s)} ${n(
      15 * s,
    )} 0c${n(5 * s)} ${n(-7 * s)} ${n(9 * s)} ${n(-7 * s)} ${n(15 * s)} 0" fill="none" stroke="${color}" stroke-width="${n(
      3 * s,
    )}" stroke-linecap="round" opacity="0.4"/>`;
  return at(x, y, scale, wing(0, 0, 1) + wing(46, 22, 0.75) + wing(-34, 30, 0.6));
}

/** Round storybook tree. `height` is trunk base to top of canopy. */
export function tree(x: number, baseY: number, height: number, art: TrackArt, tilt = 0): string {
  const s = height / 300;
  const canopy = art.leaf;
  const body =
    `<ellipse cx="0" cy="2" rx="52" ry="12" fill="#000000" opacity="0.13"/>` +
    `<path d="M-13 0c0-52 2-88 6-118 3-18 0-32-8-46 14 5 21 14 24 28 5-14 14-23 30-28-14 16-21 30-24 48-4 30-4 70-4 116z" fill="${shade(
      canopy,
      0.55,
    )}"/>` +
    `<circle cx="-46" cy="-168" r="74" fill="${canopy}"/>` +
    `<circle cx="48" cy="-190" r="64" fill="${canopy}"/>` +
    `<circle cx="6" cy="-236" r="58" fill="${canopy}"/>` +
    `<circle cx="-58" cy="-186" r="34" fill="#ffffff" opacity="0.15"/>` +
    `<circle cx="30" cy="-224" r="24" fill="#ffffff" opacity="0.2"/>` +
    `<circle cx="-4" cy="-262" r="30" fill="${tint(canopy, 0.2)}" opacity="0.7"/>` +
    `<circle cx="44" cy="-158" r="11" fill="${art.accent}"/>` +
    `<circle cx="-24" cy="-222" r="8" fill="${art.accent}" opacity="0.8"/>` +
    `<circle cx="-70" cy="-146" r="8" fill="${art.accent}" opacity="0.6"/>`;
  return group(`translate(${n(x)} ${n(baseY)}) scale(${s.toFixed(3)}) rotate(${tilt})`, body);
}

export function pine(x: number, baseY: number, height: number, art: TrackArt): string {
  const s = height / 300;
  const canopy = art.leaf;
  const body =
    `<ellipse cx="0" cy="2" rx="46" ry="10" fill="#000000" opacity="0.12"/>` +
    `<rect x="-9" y="-46" width="18" height="48" rx="6" fill="${shade(canopy, 0.55)}"/>` +
    `<path d="M0-300 66-176H-66Z" fill="${tint(canopy, 0.12)}"/>` +
    `<path d="M0-236 80-96H-80Z" fill="${canopy}"/>` +
    `<path d="M0-166 94-40H-94Z" fill="${shade(canopy, 0.12)}"/>` +
    `<path d="M0-300 24-256h-48Z" fill="#ffffff" opacity="0.2"/>` +
    `<circle cx="-40" cy="-120" r="8" fill="${art.accent}" opacity="0.7"/>`;
  return group(`translate(${n(x)} ${n(baseY)}) scale(${s.toFixed(3)})`, body);
}

export function bush(x: number, baseY: number, height: number, art: TrackArt): string {
  const s = height / 110;
  return at(
    x,
    baseY,
    s,
    `<ellipse cx="0" cy="2" rx="70" ry="12" fill="#000000" opacity="0.12"/>` +
      `<path d="M-74 0c-12-42 8-74 38-74 8-26 42-32 60-12 28-8 50 14 48 42-1 17-9 32-20 44z" fill="${art.leaf}"/>` +
      `<path d="M-40-44c8-14 22-20 36-16" stroke="#ffffff" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.25"/>` +
      `<circle cx="30" cy="-44" r="9" fill="${art.accent}"/>` +
      `<circle cx="-16" cy="-64" r="7" fill="${art.accent}" opacity="0.8"/>`,
  );
}

/** Grass blades and flowers along a line. */
export function planting(options: {
  width: number;
  baseY: number;
  art: TrackArt;
  density?: number;
  seed?: number;
  scale?: number;
}): string {
  const { width, baseY, art, density = 16, seed = 1, scale = 1 } = options;
  const blade = shade(art.leaf, 0.2);
  let out = "";
  for (let i = 0; i < density; i++) {
    const t = (i + 0.5) / density;
    const jitter = Math.sin(seed * 12.9898 + i * 78.233) * 0.5 + 0.5;
    const x = t * width + (jitter - 0.5) * (width / density);
    const y = baseY + jitter * 22;
    const s = (0.8 + jitter * 0.8) * scale;
    out +=
      at(
        x,
        y,
        s,
        `<path d="M0 0c-3-24 1-38 9-48M0 0c3-22 12-32 24-38M0 0c-8-16-19-23-32-24" fill="none" stroke="${blade}" stroke-width="6" stroke-linecap="round" opacity="0.5"/>`,
      ) +
      (i % 3 === 1
        ? at(
            x + 30,
            y - 2,
            s * 0.95,
            `<path d="M0 0v-34" stroke="${blade}" stroke-width="4" opacity="0.55" stroke-linecap="round"/>` +
              `<circle cy="-40" r="11" fill="${art.accent}"/><circle cy="-40" r="4" fill="#fff8e2"/>`,
          )
        : "");
  }
  return out;
}

export type ChildLook = {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  /** "bob" | "curls" | "short" | "puffs" | "braids" | "ponytail" */
  hairStyle?: string;
};

/**
 * Hair sits on a head centred on the origin with radius 52. Every style starts
 * from the same fringe so the hairline lands in the same place.
 */
const FRINGE =
  "M-54 6C-54-42-30-64 0-64S54-42 54 6C42-22 26-34 0-34S-42-22-54 6Z";

function hairFor(style: string, hair: string): string {
  const base = `<path d="${FRINGE}" fill="${hair}"/>`;
  const sheen = `<path d="M-26-46c14-8 34-8 48 2-16-6-34-6-48-2z" fill="#ffffff" opacity="0.22"/>`;

  switch (style) {
    case "bob":
      return (
        `<path d="M-54 6c-6 22-4 40 2 54h20c-8-18-10-36-6-54zM54 6c6 22 4 40-2 54H32c8-18 10-36 6-54z" fill="${hair}"/>` +
        base +
        sheen
      );
    case "curls":
      return (
        `<g fill="${hair}"><circle cx="-38" cy="-26" r="22"/><circle cx="-18" cy="-52" r="24"/><circle cx="14" cy="-58" r="24"/><circle cx="40" cy="-34" r="22"/><circle cx="-52" cy="0" r="17"/><circle cx="52" cy="-4" r="17"/></g>` +
        `<circle cx="-16" cy="-56" r="9" fill="#ffffff" opacity="0.2"/>`
      );
    case "puffs":
      return (
        `<g fill="${hair}"><circle cx="-58" cy="-10" r="26"/><circle cx="58" cy="-10" r="26"/></g>` +
        base +
        `<circle cx="-58" cy="-16" r="9" fill="#ffffff" opacity="0.16"/>`
      );
    case "braids":
      return (
        `<g fill="${hair}"><path d="M-52 0c-12 22-14 48-8 74 12 2 20-6 20-18 0-17-5-37-12-56z"/>` +
        `<path d="M52 0c12 22 14 48 8 74-12 2-20-6-20-18 0-17 5-37 12-56z"/></g>` +
        base +
        `<circle cx="-46" cy="72" r="9" fill="${tint(hair, 0.5)}"/><circle cx="46" cy="72" r="9" fill="${tint(
          hair,
          0.5,
        )}"/>`
      );
    case "ponytail":
      return (
        `<path d="M46-16c28 10 40 36 34 68-5 26-20 40-38 44 14-24 16-48 8-72-4-14-4-26-4-40z" fill="${hair}"/>` +
        base +
        sheen
      );
    default:
      return base + sheen;
  }
}

/**
 * A child standing front-on, the way the covers show them: feet at `baseY`,
 * `height` tall overall. Every child drawn here is invented.
 */
export function child(
  x: number,
  baseY: number,
  height: number,
  look: ChildLook,
  options: { wave?: boolean; holding?: string; behind?: string } = {},
): string {
  const s = height / 304;
  const { skin, hair, top, bottom, hairStyle = "short" } = look;
  const shoe = "#3b2b20";
  const sleeve = shade(top, 0.14);

  const arms = options.wave
    ? `<path d="M-52-186c-18 12-26 34-26 60" stroke="${skin}" stroke-width="22" stroke-linecap="round" fill="none"/>` +
      `<circle cx="-78" cy="-122" r="16" fill="${skin}"/>` +
      `<path d="M52-186c22 2 34-20 36-50" stroke="${skin}" stroke-width="22" stroke-linecap="round" fill="none"/>` +
      `<circle cx="88" cy="-240" r="17" fill="${skin}"/>`
    : `<path d="M-52-186c-16 16-24 38-24 62" stroke="${skin}" stroke-width="22" stroke-linecap="round" fill="none"/>` +
      `<circle cx="-76" cy="-120" r="16" fill="${skin}"/>` +
      `<path d="M52-186c16 16 24 38 24 62" stroke="${skin}" stroke-width="22" stroke-linecap="round" fill="none"/>` +
      `<circle cx="76" cy="-120" r="16" fill="${skin}"/>`;

  const body =
    `<ellipse cx="0" cy="4" rx="76" ry="15" fill="#000000" opacity="0.15"/>` +
    (options.behind ?? "") +
    // legs and shoes
    `<path d="M-32-104h26v88h-26zM6-104h26v88H6z" fill="${bottom}"/>` +
    `<path d="M-38-18h32c5 0 8 4 8 10v8h-48v-8c0-6 3-10 8-10zM6-18h32c5 0 8 4 8 10v8H-2v-8c0-6 3-10 8-10z" fill="${shoe}"/>` +
    // torso
    `<path d="M-46-104c-10-46-4-90 46-90s56 44 46 90z" fill="${top}"/>` +
    `<path d="M-46-104c-10-46-4-90 46-90 7 0 13 1 18 3-30 12-42 48-40 87z" fill="#ffffff" opacity="0.16"/>` +
    arms +
    `<path d="M-56-184c-10 8-14 20-12 34 12 4 22-2 28-14zM56-184c10 8 14 20 12 34-12 4-22-2-28-14z" fill="${sleeve}"/>` +
    `<path d="M-30-192c8 12 18 18 30 18s22-6 30-18" fill="none" stroke="${sleeve}" stroke-width="6" opacity="0.6"/>` +
    // neck and head
    `<path d="M-15-200c3 10 8 14 15 14s12-4 15-14z" fill="${shade(skin, 0.12)}"/>` +
    `<circle cx="0" cy="-252" r="52" fill="${skin}"/>` +
    `<g transform="translate(0 -252)">${hairFor(hairStyle, hair)}</g>` +
    `<circle cx="-18" cy="-256" r="6.5" fill="#2b1d12"/>` +
    `<circle cx="18" cy="-256" r="6.5" fill="#2b1d12"/>` +
    `<circle cx="-15.6" cy="-259" r="2.2" fill="#ffffff"/>` +
    `<circle cx="20.4" cy="-259" r="2.2" fill="#ffffff"/>` +
    `<path d="M-14-234c8 9 20 9 28 0" stroke="#2b1d12" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<circle cx="-33" cy="-242" r="9" fill="#e08a7a" opacity="0.45"/>` +
    `<circle cx="33" cy="-242" r="9" fill="#e08a7a" opacity="0.45"/>` +
    (options.holding ?? "");

  return at(x, baseY, s, body);
}

export type CompanionKind = "fox" | "owl" | "bunny" | "cat" | "turtle" | "bird" | "mouse" | "pup";

/** A small invented companion — the covers always give the child a friend. */
export function companion(
  kind: CompanionKind,
  x: number,
  baseY: number,
  height: number,
  art: TrackArt,
): string {
  const s = height / 160;
  const shadow = `<ellipse cx="0" cy="4" rx="58" ry="12" fill="#000000" opacity="0.14"/>`;
  const eyes = (y: number, gap: number, r = 6) =>
    `<circle cx="${n(-gap)}" cy="${n(y)}" r="${r}" fill="#2b1d12"/><circle cx="${n(gap)}" cy="${n(
      y,
    )}" r="${r}" fill="#2b1d12"/>` +
    `<circle cx="${n(-gap + 2)}" cy="${n(y - 2)}" r="2" fill="#ffffff"/><circle cx="${n(
      gap + 2,
    )}" cy="${n(y - 2)}" r="2" fill="#ffffff"/>`;
  const orange = "#e08a4e";
  const cream = "#fff3e2";

  switch (kind) {
    case "fox":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-52 0c-26-2-44-18-40-38 14-10 32 2 46 22z" fill="${orange}"/>` +
          `<path d="M-52-30c-14-4-24-12-22-22 10-6 20 0 28 12z" fill="${cream}"/>` +
          `<path d="M-44 0c0-46 20-74 44-74s44 28 44 74z" fill="${orange}"/>` +
          `<path d="M-18 0c0-22 8-34 18-34s18 12 18 34z" fill="${cream}"/>` +
          `<circle cx="0" cy="-86" r="34" fill="${orange}"/>` +
          `<path d="M-30-104c-8-22-4-40 8-48 12 8 18 26 16 46zM30-104c8-22 4-40-8-48-12 8-18 26-16 46z" fill="${orange}"/>` +
          `<path d="M-24-108c-4-12-2-22 4-26 6 4 9 14 8 24zM24-108c4-12 2-22-4-26-6 4-9 14-8 24z" fill="${shade(
            orange,
            0.35,
          )}"/>` +
          `<path d="M-26-80c6-16 16-24 26-24s20 8 26 24c-8 16-18 24-26 24s-18-8-26-24z" fill="${cream}"/>` +
          eyes(-92, 15) +
          `<path d="M0-70c-6 0-10-4-10-8h20c0 4-4 8-10 8z" fill="#2b1d12"/>`,
      );
    case "owl":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-48 0c-10-58 12-96 48-96s58 38 48 96z" fill="${art.prop}"/>` +
          `<path d="M-30-8c-8-38 6-62 30-62s38 24 30 62z" fill="${cream}" opacity="0.75"/>` +
          `<circle cx="-19" cy="-64" r="19" fill="${cream}"/><circle cx="19" cy="-64" r="19" fill="${cream}"/>` +
          eyes(-64, 19, 9) +
          `<path d="M0-56 11-44H-11Z" fill="${art.warm}"/>` +
          `<path d="M-44-86l14-22 12 18zM44-86l-14-22-12 18z" fill="${art.prop}"/>` +
          `<path d="M-26-16c-8-14-8-30 0-42M26-16c8-14 8-30 0-42" stroke="${shade(art.prop, 0.25)}" stroke-width="5" fill="none" opacity="0.5"/>`,
      );
    case "bunny":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-40 0c-6-46 12-74 40-74s46 28 40 74z" fill="${cream}"/>` +
          `<circle cx="0" cy="-86" r="32" fill="${cream}"/>` +
          `<path d="M-22-112c-12-30-12-58-2-66 12 6 19 34 16 66zM22-112c12-30 12-58 2-66-12 6-19 34-16 66z" fill="${cream}"/>` +
          `<path d="M-18-116c-7-22-7-42-1-48 7 4 11 26 10 48zM18-116c7-22 7-42 1-48-7 4-11 26-10 48z" fill="${art.accent}" opacity="0.45"/>` +
          eyes(-90, 13) +
          `<path d="M0-74c-5 0-8-3-8-6h16c0 3-3 6-8 6z" fill="#c98a8a"/>` +
          `<path d="M-30-70h-18M-30-64h-18M30-70h18M30-64h18" stroke="#2b1d12" stroke-width="3" opacity="0.4" stroke-linecap="round"/>` +
          `<circle cx="44" cy="-10" r="16" fill="#ffffff"/>`,
      );
    case "cat":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-42 0c-6-50 14-80 42-80s48 30 42 80z" fill="${shade(art.deep, 0.05)}"/>` +
          `<path d="M42 0c26-8 36-30 26-48-16-6-28 8-36 28z" fill="${shade(art.deep, 0.05)}"/>` +
          `<circle cx="0" cy="-92" r="34" fill="${shade(art.deep, 0.05)}"/>` +
          `<path d="M-34-110l-6-30 28 14zM34-110l6-30-28 14z" fill="${shade(art.deep, 0.05)}"/>` +
          `<path d="M-28-112l-3-16 15 8zM28-112l3-16-15 8z" fill="${art.accent}" opacity="0.5"/>` +
          eyes(-94, 15, 7) +
          `<path d="M0-78c-4 0-7-3-7-5h14c0 2-3 5-7 5z" fill="${art.accent}"/>` +
          `<path d="M-14-70c4 6 10 6 14 0" stroke="#2b1d12" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      );
    case "turtle":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-72 0c0-44 32-72 72-72s72 28 72 72z" fill="${art.leaf}"/>` +
          `<path d="M-46-22c6-20 22-32 46-32s40 12 46 32z" fill="${tint(art.leaf, 0.3)}" opacity="0.7"/>` +
          `<path d="M-24-34c6-10 14-16 24-16s18 6 24 16z" fill="${shade(art.leaf, 0.2)}" opacity="0.6"/>` +
          `<path d="M72-8c24-4 38-18 34-36-18-8-32 4-40 24z" fill="${art.warm}"/>` +
          `<circle cx="92" cy="-36" r="5" fill="#2b1d12"/>` +
          `<path d="M-66 0c-14 2-22 8-22 16h30z" fill="${art.warm}"/>`,
      );
    case "bird":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-36 0c-8-38 6-62 36-62s44 24 36 62z" fill="${art.prop}"/>` +
          `<path d="M-6-4c-6-24 2-40 20-40s26 16 20 40z" fill="${cream}" opacity="0.6"/>` +
          `<circle cx="0" cy="-70" r="26" fill="${art.prop}"/>` +
          eyes(-74, 10) +
          `<path d="M22-70l22 8-22 8z" fill="${art.warm}"/>` +
          `<path d="M-36-30c-18 6-26 18-22 30 14 4 26-8 32-22z" fill="${shade(art.prop, 0.2)}"/>` +
          `<path d="M-6-96c0-14 6-22 14-24 2 12-2 20-8 26z" fill="${art.warm}"/>`,
      );
    case "mouse":
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-36 0c-6-40 10-62 36-62s42 22 36 62z" fill="#cfc2b4"/>` +
          `<circle cx="-30" cy="-58" r="20" fill="#cfc2b4"/><circle cx="30" cy="-58" r="20" fill="#cfc2b4"/>` +
          `<circle cx="-30" cy="-58" r="11" fill="${art.accent}" opacity="0.45"/><circle cx="30" cy="-58" r="11" fill="${art.accent}" opacity="0.45"/>` +
          `<circle cx="0" cy="-44" r="26" fill="#ded3c6"/>` +
          eyes(-48, 11) +
          `<path d="M0-30c-5 0-8-3-8-6h16c0 3-3 6-8 6z" fill="#c98a8a"/>` +
          `<path d="M-36-4c-24 4-36-4-34-18" fill="none" stroke="#cfc2b4" stroke-width="7" stroke-linecap="round"/>`,
      );
    case "pup":
    default:
      return at(
        x,
        baseY,
        s,
        shadow +
          `<path d="M-44 0c-8-48 12-76 44-76s52 28 44 76z" fill="${art.warm}"/>` +
          `<path d="M-14 0c0-24 6-38 14-38s14 14 14 38z" fill="${cream}"/>` +
          `<circle cx="0" cy="-88" r="34" fill="${art.warm}"/>` +
          `<path d="M-34-96c-18 2-28 18-24 36 12 8 24-2 30-18zM34-96c18 2 28 18 24 36-12 8-24-2-30-18z" fill="${art.accent}"/>` +
          eyes(-94, 14) +
          `<path d="M0-74c-6 0-10-4-10-7h20c0 3-4 7-10 7z" fill="#2b1d12"/>` +
          `<path d="M0-67v8M-8-56c4 4 12 4 16 0" stroke="#2b1d12" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      );
  }
}

/** Bunting across the top of a scene — reads instantly as "celebration". */
export function bunting(width: number, y: number, art: TrackArt, flags = 9): string {
  const colors = [art.accent, art.prop, art.warm, art.leaf];
  let out = `<path d="M0 ${n(y)}Q${n(width / 2)} ${n(y + 80)} ${n(width)} ${n(y)}" fill="none" stroke="${shade(
    art.deep,
    0,
  )}" stroke-width="5" opacity="0.35"/>`;
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    const x = t * width;
    const sag = Math.sin(Math.PI * t) * 80;
    out += `<path d="M${n(x - 24)} ${n(y + sag)}h48l-24 52z" fill="${colors[i % colors.length]}" opacity="0.95"/>`;
    out += `<path d="M${n(x - 24)} ${n(y + sag)}h48l-6 13h-36z" fill="#ffffff" opacity="0.2"/>`;
  }
  return out;
}

/** A low picket fence, good for pushing the middle distance back. */
export function fence(x: number, baseY: number, width: number, art: TrackArt): string {
  const color = tint(art.prop, 0.55);
  const posts = Math.max(3, Math.round(width / 54));
  let out = "";
  for (let i = 0; i < posts; i++) {
    const px = x + (i / (posts - 1)) * width - width / 2;
    out += `<path d="M${n(px - 11)} ${n(baseY)}v-74l11-16 11 16v74z" fill="${color}"/>`;
  }
  out += `<rect x="${n(x - width / 2)}" y="${n(baseY - 58)}" width="${n(width)}" height="11" fill="${color}"/>`;
  out += `<rect x="${n(x - width / 2)}" y="${n(baseY - 30)}" width="${n(width)}" height="11" fill="${color}"/>`;
  return out;
}

/** Warm light pooling in from one corner, then a soft edge darkening. */
export function lightWash(width: number, height: number, uid: string): string {
  return (
    `<rect width="${n(width)}" height="${n(height)}" fill="url(#${uid}-wash)"/>` +
    `<rect width="${n(width)}" height="${n(height)}" fill="url(#${uid}-vignette)"/>`
  );
}
