/**
 * One illustrated scene per theme, drawn in the same picture style everywhere
 * it appears: theme tiles, the create-page panel, story-page panels, and the
 * cover art and 3D mockups rasterized into `public/brand/`.
 *
 * `themeScene()` returns plain SVG markup, so React can inline it and the
 * asset script can hand the same string to Sharp. On a square cover the top of
 * the picture is kept clear for the lettering that gets baked in on top.
 */

import type { Track, TrackArt } from "../tracks.ts";
import {
  at,
  birds,
  bunting,
  bush,
  child,
  cloud,
  companion,
  fence,
  lightWash,
  mix,
  n,
  pine,
  planting,
  ridge,
  shade,
  sunDisc,
  tint,
  tree,
  type ChildLook,
} from "./primitives.ts";

export type SceneShape = "square" | "wide";

export type SceneTrack = Pick<Track, "slug" | "art">;

export type Scene = {
  width: number;
  height: number;
  viewBox: string;
  /** Everything inside the <svg> element, defs included. */
  markup: string;
};

type Layout = {
  width: number;
  height: number;
  /** Where the far land meets the sky. */
  horizon: number;
  /** The line the characters stand on. */
  ground: number;
  centerX: number;
  childHeight: number;
  /** True when lettering will be baked across the top of the picture. */
  titleRoom: boolean;
};

const SHAPES: Record<SceneShape, Layout> = {
  // Square, like the printed book. The top half stays quiet for the title.
  square: {
    width: 1200,
    height: 1200,
    horizon: 790,
    ground: 1035,
    centerX: 600,
    childHeight: 400,
    titleRoom: true,
  },
  // Wide, for tiles and page panels: the same scene, framed closer.
  wide: {
    width: 1200,
    height: 800,
    horizon: 330,
    ground: 655,
    centerX: 600,
    childHeight: 430,
    titleRoom: false,
  },
};

/** Invented children, one per theme, so no two scenes show the same kid. */
const CHILD_LOOKS: Record<string, ChildLook> = {
  alphabet: { skin: "#e8b48c", hair: "#43301f", top: "#f4f0e6", bottom: "#3f5f86", hairStyle: "curls" },
  numbers: { skin: "#f2cfae", hair: "#8c5a2b", top: "#e07a4e", bottom: "#33506b", hairStyle: "short" },
  "colors-shapes": { skin: "#8a5a3b", hair: "#2a1a12", top: "#f6f2ea", bottom: "#7a4ea3", hairStyle: "puffs" },
  emotions: { skin: "#f0c9a8", hair: "#c2703a", top: "#e4a0b2", bottom: "#64486a", hairStyle: "bob" },
  "kindness-values": { skin: "#6f4529", hair: "#241812", top: "#f4efe4", bottom: "#3f7a52", hairStyle: "braids" },
  "life-milestones": { skin: "#edc39c", hair: "#5a3a22", top: "#d2643c", bottom: "#4a5f7a", hairStyle: "short" },
  "animals-nature": { skin: "#c98f63", hair: "#33241a", top: "#6d9a54", bottom: "#4a4032", hairStyle: "curls" },
  manners: { skin: "#f4d5b6", hair: "#d9a441", top: "#7795c4", bottom: "#41506b", hairStyle: "ponytail" },
};

const FALLBACK_LOOK: ChildLook = {
  skin: "#eec19c",
  hair: "#4a3324",
  top: "#f2efe6",
  bottom: "#4a5f7a",
  hairStyle: "short",
};

function defs(art: TrackArt, uid: string, layout: Layout): string {
  return (
    `<defs>` +
    `<linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${tint(art.skyTop, 0.25)}"/>` +
    `<stop offset="0.55" stop-color="${art.skyTop}"/>` +
    `<stop offset="1" stop-color="${art.skyBottom}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${uid}-glow" cx="0.5" cy="0.5">` +
    `<stop offset="0" stop-color="${art.warm}" stop-opacity="0.8"/>` +
    `<stop offset="1" stop-color="${art.warm}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="${uid}-wash" cx="0.24" cy="0.1" r="0.9">` +
    `<stop offset="0" stop-color="#fff3d8" stop-opacity="0.45"/>` +
    `<stop offset="1" stop-color="#fff3d8" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="${uid}-vignette" cx="0.5" cy="0.46" r="0.8">` +
    `<stop offset="0.5" stop-color="${art.deep}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${art.deep}" stop-opacity="0.3"/>` +
    `</radialGradient>` +
    `<linearGradient id="${uid}-meadow" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${tint(art.leaf, 0.22)}"/>` +
    `<stop offset="1" stop-color="${art.leaf}"/>` +
    `</linearGradient>` +
    `<clipPath id="${uid}-frame"><rect width="${n(layout.width)}" height="${n(layout.height)}"/></clipPath>` +
    `</defs>`
  );
}

function sky(art: TrackArt, uid: string, layout: Layout): string {
  const { width, height, horizon, titleRoom } = layout;
  // On a cover the sun and clouds hug the edges so the lettering has clear sky.
  const sunX = titleRoom ? width * 0.87 : width * 0.8;
  const sunY = titleRoom ? horizon - 170 : horizon - 250;
  return (
    `<rect width="${n(width)}" height="${n(height)}" fill="url(#${uid}-sky)"/>` +
    sunDisc(sunX, sunY, titleRoom ? 78 : 86, art, uid) +
    (titleRoom
      ? cloud(width * 0.11, horizon - 210, 1.05, 0.75) +
        cloud(width * 0.93, horizon - 320, 0.72, 0.5) +
        birds(width * 0.2, horizon - 330, 0.9, art.deep)
      : cloud(width * 0.18, horizon - 250, 1.15, 0.8) +
        cloud(width * 0.66, horizon - 320, 0.85, 0.55) +
        cloud(width * 0.92, horizon - 150, 0.7, 0.45) +
        birds(width * 0.4, horizon - 200, 1, art.deep))
  );
}

/** Hills stepping back to the horizon, then the meadow the characters stand on. */
function land(art: TrackArt, uid: string, layout: Layout): string {
  const { width, height, horizon, ground } = layout;
  const far = mix(art.hillFar, art.skyBottom, 0.45);
  const mid = art.hillFar;
  const meadowTop = ground - 150;
  return (
    ridge({ width, top: horizon - 120, bottom: height, amplitude: 52, bumps: 3, phase: 0.6, fill: far }) +
    ridge({ width, top: horizon - 30, bottom: height, amplitude: 38, bumps: 4, phase: 2.2, fill: mid }) +
    ridge({
      width,
      top: horizon + 60,
      bottom: height,
      amplitude: 26,
      bumps: 2,
      phase: 1.1,
      fill: art.hillNear,
    }) +
    ridge({ width, top: meadowTop, bottom: height, amplitude: 30, bumps: 2, phase: 3.4, fill: `url(#${uid}-meadow)` }) +
    // Sunlight lying across the meadow, so the grass is not one flat band.
    `<ellipse cx="${n(width * 0.46)}" cy="${n(ground + 30)}" rx="${n(width * 0.56)}" ry="${n(
      92,
    )}" fill="${tint(art.leaf, 0.35)}" opacity="0.5"/>` +
    `<ellipse cx="${n(width * 0.2)}" cy="${n(ground - 80)}" rx="${n(width * 0.2)}" ry="42" fill="${tint(
      art.leaf,
      0.3,
    )}" opacity="0.35"/>` +
    planting({ width, baseY: meadowTop + 34, art, density: 11, seed: 11, scale: 0.55 }) +
    planting({ width, baseY: ground - 34, art, density: 9, seed: 5, scale: 0.75 })
  );
}

function foreground(art: TrackArt, layout: Layout): string {
  const { width, height } = layout;
  return (
    `<path d="M0 ${n(height - 64)}c${n(width * 0.22)} ${n(-34)} ${n(width * 0.44)} ${n(-26)} ${n(
      width * 0.66,
    )} ${n(-4)}c${n(width * 0.16)} ${n(18)} ${n(width * 0.24)} ${n(14)} ${n(width * 0.34)} ${n(
      -12,
    )}V${n(height)}H0Z" fill="${shade(art.leaf, 0.22)}" opacity="0.65"/>` +
    planting({ width, baseY: height - 54, art, density: 13, seed: 3, scale: 0.9 }) +
    planting({ width, baseY: height - 6, art, density: 9, seed: 7, scale: 1.25 })
  );
}

function look(slug: string): ChildLook {
  return CHILD_LOOKS[slug] ?? FALLBACK_LOOK;
}

/** Big picture-book letter block. */
function letterBlock(x: number, y: number, size: number, letter: string, art: TrackArt, tilt = 0): string {
  const half = size / 2;
  return at(
    x,
    y,
    1,
    `<g transform="rotate(${tilt})">` +
      `<rect x="${n(-half)}" y="${n(-half)}" width="${n(size)}" height="${n(size)}" rx="${n(
        size * 0.16,
      )}" fill="#fff8ec"/>` +
      `<rect x="${n(-half)}" y="${n(-half)}" width="${n(size)}" height="${n(size)}" rx="${n(
        size * 0.16,
      )}" fill="none" stroke="${shade(art.prop, 0.15)}" stroke-width="7" opacity="0.45"/>` +
      `<rect x="${n(-half + 6)}" y="${n(half - size * 0.2)}" width="${n(size - 12)}" height="${n(
        size * 0.14,
      )}" rx="${n(size * 0.05)}" fill="${art.accent}" opacity="0.55"/>` +
      `<text x="0" y="${n(size * 0.26)}" text-anchor="middle" font-size="${n(
        size * 0.64,
      )}" font-weight="800" font-family="Fraunces, Georgia, serif" fill="${art.deep}">${letter}</text>` +
      `</g>`,
  );
}

function alphabetScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, horizon, childHeight: h } = layout;
  return (
    tree(centerX - 470, ground - 30, 330, art, -3) +
    fence(centerX + 300, ground - 40, 420, art) +
    bush(centerX + 470, ground + 10, 120, art) +
    // A kite flying low enough to stay out of the lettering.
    at(
      centerX + 250,
      horizon - 40,
      1,
      `<g transform="rotate(-16)"><path d="M0-96 70 0 0 104-70 0Z" fill="${art.prop}"/>` +
        `<path d="M0-96 0 104M-70 0 70 0" stroke="#fff6ea" stroke-width="7" opacity="0.75"/>` +
        `<path d="M0 104c24 30-24 50 0 80s-22 46-4 72" stroke="${art.deep}" stroke-width="6" fill="none" opacity="0.4"/>` +
        `<path d="M-30 128l26 10-26 10zM8 176l26 10-26 10z" fill="${art.accent}"/></g>`,
    ) +
    letterBlock(centerX - 330, ground - 78, 156, "B", art, -7) +
    letterBlock(centerX - 216, ground - 212, 122, "C", art, 6) +
    child(centerX + 40, ground, h, look("alphabet"), {
      holding:
        `<g transform="translate(-104 -132) rotate(-8)">` +
        `<rect x="-70" y="-70" width="140" height="140" rx="26" fill="#fff8ec"/>` +
        `<rect x="-70" y="-70" width="140" height="140" rx="26" fill="none" stroke="${shade(
          art.prop,
          0.15,
        )}" stroke-width="7" opacity="0.45"/>` +
        `<text x="0" y="34" text-anchor="middle" font-size="96" font-weight="800" font-family="Fraunces, Georgia, serif" fill="${art.deep}">A</text></g>`,
    }) +
    companion("fox", centerX + 255, ground + 6, 150, art)
  );
}

function numbersScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, horizon, childHeight: h } = layout;
  const balloon = (x: number, y: number, r: number, label: string, fill: string) =>
    `<path d="M${n(x)} ${n(y + r)}c8 ${n(r * 0.8)} -12 ${n(r * 1.3)} 0 ${n(r * 2.1)}" stroke="${
      art.deep
    }" stroke-width="5" fill="none" opacity="0.35"/>` +
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r)}" ry="${n(r * 1.14)}" fill="${fill}"/>` +
    `<path d="M${n(x)} ${n(y + r * 1.1)}l-9 12h18z" fill="${shade(fill, 0.25)}"/>` +
    `<path d="M${n(x - r * 0.6)} ${n(y - r * 0.18)}a${n(r * 0.72)} ${n(r * 0.72)} 0 0 1 ${n(
      r * 0.52,
    )} ${n(-r * 0.6)}" stroke="#ffffff" stroke-width="${n(r * 0.17)}" fill="none" opacity="0.55" stroke-linecap="round"/>` +
    `<text x="${n(x)}" y="${n(y + r * 0.36)}" text-anchor="middle" font-size="${n(
      r * 1,
    )}" font-weight="800" font-family="Fraunces, Georgia, serif" fill="${shade(fill, 0.55)}">${label}</text>`;

  const stone = (x: number, y: number, label: string) =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="62" ry="24" fill="${tint(art.hillFar, 0.35)}"/>` +
    `<ellipse cx="${n(x)}" cy="${n(y - 5)}" rx="62" ry="24" fill="${tint(art.hillFar, 0.55)}"/>` +
    `<text x="${n(x)}" y="${n(y + 6)}" text-anchor="middle" font-size="40" font-weight="800" font-family="Fraunces, Georgia, serif" fill="${
      art.deep
    }" opacity="0.55">${label}</text>`;

  return (
    tree(centerX + 470, ground - 24, 300, art, 4) +
    bush(centerX - 500, ground + 6, 130, art) +
    stone(centerX - 430, ground + 40, "1") +
    stone(centerX - 300, ground + 74, "2") +
    stone(centerX - 170, ground + 106, "3") +
    balloon(centerX + 300, horizon + 30, 80, "1", art.prop) +
    balloon(centerX + 440, horizon + 160, 62, "2", art.accent) +
    balloon(centerX + 180, horizon + 130, 52, "3", art.warm) +
    child(centerX + 130, ground, h, look("numbers"), { wave: true }) +
    companion("bird", centerX - 40, ground + 4, 130, art)
  );
}

function colorsShapesScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, childHeight: h } = layout;
  const arcs = ["#e0709b", art.accent, art.warm, art.leaf, art.prop];
  let rainbow = "";
  arcs.forEach((color, i) => {
    const r = 400 - i * 42;
    rainbow += `<path d="M${n(centerX - r)} ${n(ground - 40)}a${n(r)} ${n(r)} 0 0 1 ${n(
      r * 2,
    )} 0" fill="none" stroke="${color}" stroke-width="38" opacity="${i === 0 ? 0.9 : 0.8}" stroke-linecap="round"/>`;
  });
  return (
    rainbow +
    `<circle cx="${n(centerX - 380)}" cy="${n(ground - 96)}" r="86" fill="${art.prop}"/>` +
    `<circle cx="${n(centerX - 380)}" cy="${n(ground - 96)}" r="86" fill="none" stroke="#fff6ea" stroke-width="10" opacity="0.65"/>` +
    `<g transform="rotate(-8 ${n(centerX + 330)} ${n(ground - 90)})">` +
    `<rect x="${n(centerX + 258)}" y="${n(ground - 162)}" width="144" height="144" rx="24" fill="${art.accent}"/>` +
    `<rect x="${n(centerX + 258)}" y="${n(ground - 162)}" width="144" height="144" rx="24" fill="none" stroke="#fff6ea" stroke-width="10" opacity="0.6"/>` +
    `</g>` +
    `<path d="M${n(centerX + 470)} ${n(ground - 176)} ${n(centerX + 548)} ${n(ground - 24)} ${n(
      centerX + 392,
    )} ${n(ground - 24)}Z" fill="#fff6ea"/>` +
    `<path d="M${n(centerX + 470)} ${n(ground - 176)} ${n(centerX + 548)} ${n(ground - 24)} ${n(
      centerX + 392,
    )} ${n(ground - 24)}Z" fill="none" stroke="${art.deep}" stroke-width="7" opacity="0.25"/>` +
    // Paint pots at the child's feet.
    at(
      centerX - 210,
      ground + 8,
      1,
      `<path d="M-46 0h92l-10-64h-72z" fill="${art.prop}"/><ellipse cx="0" cy="-64" rx="46" ry="12" fill="${tint(
        art.prop,
        0.5,
      )}"/><path d="M-20-64c4-14 36-14 40 0z" fill="#fff6ea" opacity="0.7"/>`,
    ) +
    child(centerX + 30, ground, h, look("colors-shapes"), {
      holding: `<g transform="translate(92 -108) rotate(12)"><path d="M0 0c-34-24-58-48-58-76 0-21 16-37 34-37 10 0 19 5 24 13 5-8 14-13 24-13 18 0 34 16 34 37 0 28-24 52-58 76z" fill="${art.prop}"/><path d="M-22-64c5-8 13-11 22-9" stroke="#fff6ea" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"/></g>`,
    }) +
    companion("cat", centerX - 190, ground + 4, 150, art)
  );
}

function emotionsScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, horizon, childHeight: h, titleRoom } = layout;
  const feelingCloud = (x: number, y: number, scale: number, mouth: string, extra = "") =>
    at(
      x,
      y,
      scale,
      `<path d="M-96 30c-27 0-50-18-50-41s23-41 50-41c10-25 39-40 66-33 24 6 41 24 45 48 25 2 43 19 43 40 0 23-21 27-48 27z" fill="#fffaf0" opacity="0.97"/>` +
        `<circle cx="-28" cy="-6" r="7" fill="#2b1d12"/><circle cx="28" cy="-6" r="7" fill="#2b1d12"/>` +
        mouth +
        extra,
    );
  const skyY = titleRoom ? horizon - 60 : horizon - 190;
  return (
    feelingCloud(
      centerX - 370,
      skyY,
      0.95,
      `<path d="M-24 18c11 16 37 16 48 0" stroke="#2b1d12" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      `<circle cx="-52" cy="10" r="13" fill="${art.accent}" opacity="0.5"/><circle cx="52" cy="10" r="13" fill="${art.accent}" opacity="0.5"/>`,
    ) +
    feelingCloud(
      centerX + 350,
      skyY - 90,
      0.8,
      `<path d="M-22 26c11-14 33-14 44 0" stroke="#2b1d12" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      `<path d="M6 40c9 14 9 24 0 27s-12-13 0-27z" fill="${art.prop}" opacity="0.85"/>` +
        `<path d="M-40 44c9 14 9 24 0 27s-12-13 0-27z" fill="${art.prop}" opacity="0.6"/>`,
    ) +
    feelingCloud(
      centerX + 430,
      skyY + 150,
      0.5,
      `<path d="M-18 18h36" stroke="#2b1d12" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    ) +
    tree(centerX - 490, ground - 26, 300, art, -5) +
    bush(centerX + 470, ground + 8, 120, art) +
    child(centerX - 70, ground, h, look("emotions"), {
      holding: `<g transform="translate(86 -104)"><path d="M0-30c14-18 46-14 46 14 0 24-28 44-46 60-18-16-46-36-46-60 0-28 32-32 46-14z" fill="${art.prop}"/><path d="M-16-8c5-8 13-11 21-8" stroke="#fff6ea" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.75"/></g>`,
    }) +
    companion("bunny", centerX + 180, ground + 4, 160, art)
  );
}

function kindnessScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, childHeight: h, width, titleRoom } = layout;
  return (
    bunting(width, titleRoom ? 560 : 90, art, 8) +
    tree(centerX + 450, ground - 26, 300, art, 3) +
    bush(centerX - 470, ground + 8, 130, art) +
    // Two children carrying a lantern between them.
    child(centerX - 170, ground, h, look("kindness-values")) +
    child(centerX + 165, ground, h * 0.93, {
      skin: "#f2cfae",
      hair: "#d9a441",
      top: "#e08a4e",
      bottom: "#3f5f86",
      hairStyle: "bob",
    }) +
    at(
      centerX,
      ground - 150,
      1,
      `<path d="M0-96c0-26 22-44 48-44" fill="none" stroke="${art.deep}" stroke-width="6" opacity="0.3"/>` +
        `<path d="M0-96c0-26-22-44-48-44" fill="none" stroke="${art.deep}" stroke-width="6" opacity="0.3"/>` +
        `<path d="M-44-96h88l12 92a56 56 0 0 1-112 0z" fill="${art.warm}"/>` +
        `<path d="M-44-96h88l5 34h-98z" fill="${art.accent}"/>` +
        `<circle cx="0" cy="8" r="30" fill="#fff8e2" opacity="0.95"/>` +
        `<path d="M-44-96h88" stroke="${shade(art.accent, 0.3)}" stroke-width="6"/>`,
    ) +
    companion("pup", centerX + 340, ground + 6, 150, art)
  );
}

function milestonesScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, childHeight: h } = layout;
  const stepStone = (x: number, y: number, w: number) =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(w)}" ry="${n(w * 0.34)}" fill="${tint(
      art.hillNear,
      0.6,
    )}" opacity="0.85"/>`;
  return (
    tree(centerX - 490, ground - 28, 310, art, -4) +
    // A house with its door open: the big first waiting on the other side.
    at(
      centerX + 320,
      ground - 10,
      1,
      `<path d="M-160 0v-168h320V0z" fill="#fff6ea"/>` +
        `<path d="M-160 0v-168h60V0z" fill="${art.deep}" opacity="0.08"/>` +
        `<path d="M-192-166 0-292l192 126z" fill="${art.prop}"/>` +
        `<path d="M-192-166 0-292l192 126z" fill="#ffffff" opacity="0.12"/>` +
        `<rect x="-50" y="-124" width="100" height="124" rx="12" fill="${shade(art.prop, 0.45)}"/>` +
        `<rect x="-34" y="-110" width="68" height="110" rx="10" fill="${art.warm}"/>` +
        `<circle cx="24" cy="-58" r="7" fill="${art.deep}" opacity="0.5"/>` +
        `<rect x="-136" y="-132" width="62" height="54" rx="10" fill="${art.accent}" opacity="0.9"/>` +
        `<rect x="76" y="-132" width="62" height="54" rx="10" fill="${art.accent}" opacity="0.9"/>` +
        `<path d="M-136-105h62M76-105h62" stroke="#fff6ea" stroke-width="6" opacity="0.7"/>`,
    ) +
    stepStone(centerX - 450, ground + 130, 92) +
    stepStone(centerX - 300, ground + 92, 78) +
    stepStone(centerX - 160, ground + 56, 66) +
    child(centerX - 190, ground + 44, h, look("life-milestones"), {
      behind: `<g transform="translate(-92 -184)"><rect x="-40" y="-34" width="80" height="92" rx="22" fill="${art.accent}"/><path d="M-24-34c0-18 10-28 24-28s24 10 24 28" fill="none" stroke="${shade(
        art.accent,
        0.4,
      )}" stroke-width="8"/><rect x="-28" y="6" width="56" height="28" rx="10" fill="#fff6ea" opacity="0.85"/></g>`,
    }) +
    companion("turtle", centerX - 10, ground + 26, 130, art)
  );
}

function natureScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, childHeight: h, width, height } = layout;
  const butterfly = (x: number, y: number, scale: number, color: string) =>
    at(
      x,
      y,
      scale,
      `<path d="M0 0c-16-22-40-26-47-12s12 30 47 12zM0 0c16-22 40-26 47-12s-12 30-47 12z" fill="${color}"/>` +
        `<path d="M0-10v22" stroke="${art.deep}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>`,
    );
  return (
    pine(centerX - 500, ground - 30, 380, art) +
    pine(centerX - 350, ground - 60, 280, art) +
    pine(centerX + 500, ground - 34, 330, art) +
    tree(centerX + 320, ground - 30, 290, art, 2) +
    // A stream cutting across the meadow.
    `<path d="M0 ${n(height - 118)}c${n(width * 0.3)} ${n(-66)} ${n(width * 0.46)} ${n(44)} ${n(
      width,
    )} ${n(-34)}" stroke="#bfe0ea" stroke-width="56" fill="none" opacity="0.8" stroke-linecap="round"/>` +
    `<path d="M0 ${n(height - 126)}c${n(width * 0.3)} ${n(-66)} ${n(width * 0.46)} ${n(44)} ${n(
      width,
    )} ${n(-34)}" stroke="#ffffff" stroke-width="12" fill="none" opacity="0.45"/>` +
    child(centerX - 60, ground, h, look("animals-nature"), {
      holding: `<g transform="translate(0 -250)"><rect x="-54" y="-20" width="46" height="42" rx="12" fill="${shade(
        art.deep,
        0.1,
      )}"/><rect x="8" y="-20" width="46" height="42" rx="12" fill="${shade(art.deep, 0.1)}"/><rect x="-10" y="-10" width="20" height="16" fill="${shade(
        art.deep,
        0.1,
      )}"/><circle cx="-31" cy="1" r="11" fill="${art.warm}" opacity="0.85"/><circle cx="31" cy="1" r="11" fill="${art.warm}" opacity="0.85"/></g>`,
    }) +
    companion("fox", centerX + 150, ground + 6, 165, art) +
    companion("owl", centerX - 330, ground - 210, 130, art) +
    butterfly(centerX + 280, ground - 300, 1.2, art.accent) +
    butterfly(centerX - 190, ground - 360, 0.85, art.prop) +
    // Mushrooms in the foreground.
    at(
      centerX + 430,
      ground + 80,
      1,
      `<path d="M-14 0v-40h28V0z" fill="#fff6ea"/><path d="M-44-38c0-26 20-42 44-42s44 16 44 42z" fill="${art.prop}"/><circle cx="-16" cy="-56" r="8" fill="#fff6ea" opacity="0.85"/><circle cx="18" cy="-48" r="6" fill="#fff6ea" opacity="0.85"/>`,
    )
  );
}

function mannersScene(art: TrackArt, layout: Layout): string {
  const { centerX, ground, childHeight: h } = layout;
  return (
    tree(centerX + 480, ground - 26, 300, art, 3) +
    fence(centerX - 380, ground - 44, 420, art) +
    bush(centerX - 500, ground + 8, 120, art) +
    // A tea table set for two, with a teddy already seated.
    at(
      centerX + 250,
      ground + 10,
      1,
      `<rect x="-160" y="-28" width="320" height="26" rx="13" fill="${art.prop}"/>` +
        `<path d="M-160-28h320l-16-18h-288z" fill="#fff6ea" opacity="0.85"/>` +
        `<path d="M-124-2 -108 92M124-2 108 92" stroke="${shade(art.prop, 0.25)}" stroke-width="16" stroke-linecap="round"/>` +
        `<g transform="translate(-66 -60)"><path d="M-30 0h54v18a27 27 0 0 1-54 0z" fill="#fff6ea"/><path d="M24 3h12a10 10 0 0 1 0 20h-12" fill="none" stroke="#fff6ea" stroke-width="7"/><path d="M-16-14c-5-9 2-14 0-23M2-14c-5-9 2-14 0-23" stroke="#ffffff" stroke-width="5" fill="none" opacity="0.65" stroke-linecap="round"/></g>` +
        `<g transform="translate(60 -54)"><circle r="30" fill="#fff6ea"/><circle r="30" fill="none" stroke="${art.deep}" stroke-width="4" opacity="0.18"/><circle cy="-4" r="14" fill="${art.accent}" opacity="0.85"/></g>`,
    ) +
    companion("pup", centerX + 400, ground + 12, 150, art) +
    child(centerX - 120, ground, h, look("manners"), { wave: true }) +
    companion("mouse", centerX + 40, ground + 6, 130, art)
  );
}

const SET_PIECES: Record<string, (art: TrackArt, layout: Layout) => string> = {
  alphabet: alphabetScene,
  numbers: numbersScene,
  "colors-shapes": colorsShapesScene,
  emotions: emotionsScene,
  "kindness-values": kindnessScene,
  "life-milestones": milestonesScene,
  "animals-nature": natureScene,
  manners: mannersScene,
};

export function themeScene(
  track: SceneTrack,
  options: { shape?: SceneShape; uid?: string } = {},
): Scene {
  const shape = options.shape ?? "wide";
  const uid = (options.uid ?? track.slug).replace(/[^a-z0-9-]/gi, "");
  const layout = SHAPES[shape];
  const art = track.art;
  const setPiece = SET_PIECES[track.slug];

  const markup =
    defs(art, uid, layout) +
    `<g clip-path="url(#${uid}-frame)">` +
    sky(art, uid, layout) +
    land(art, uid, layout) +
    (setPiece ? setPiece(art, layout) : "") +
    foreground(art, layout) +
    lightWash(layout.width, layout.height, uid) +
    `</g>`;

  return {
    width: layout.width,
    height: layout.height,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    markup,
  };
}

/** A standalone SVG document, for rasterizing or writing to disk. */
export function sceneDocument(scene: Scene): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${scene.width}" height="${scene.height}" viewBox="${scene.viewBox}">${scene.markup}</svg>`
  );
}
