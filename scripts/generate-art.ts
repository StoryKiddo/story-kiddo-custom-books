/**
 * Generates the artwork that ships in `public/brand/`:
 *
 *   covers/<slug>.png    square cover art with the title lettered into the
 *                        picture and the dedication line at the foot
 *   mockups/<slug>.png   that cover built into a standing hardcover with a
 *                        spine, page block, and cast shadow
 *   hero/*.png           the gift-moment scene behind the homepage headline
 *
 * Run with:  npm run art
 *
 * Titles are drawn with the same Fraunces cut the site sets its headings in
 * (fonts/fraunces-black.ttf), so lettering inside the pictures and type on the
 * page are one typeface. Nothing here runs at request time.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { OverlayOptions, Sharp } from "sharp";
import { coverLockup, dedicationLine, personalizedBookCopy } from "../src/lib/book-title.ts";
import { sceneDocument, themeScene } from "../src/lib/art/scene.ts";
import { giftMomentScene, pressWorkshopScene } from "../src/lib/art/hero-scene.ts";
import { TRACKS, type Track } from "../src/lib/tracks.ts";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "brand");
const DISPLAY_FONT = path.join(ROOT, "fonts", "fraunces-black.ttf");
const DISPLAY_FAMILY = "Fraunces 144pt SuperSoft Wonky Black";
const SANS_FONT = path.join(ROOT, "fonts", "nunito-sans-bold.ttf");
const SANS_FAMILY = "Nunito Sans Bold";

const COVER_SIZE = 1200;

/** One invented child per theme, so every example cover shows a different kid. */
const EXAMPLE_CHILDREN: Record<string, string> = {
  alphabet: "Mia",
  numbers: "Theo",
  "colors-shapes": "Ava",
  emotions: "Noah",
  "kindness-values": "Ruby",
  "life-milestones": "Kai",
  "animals-nature": "Ivy",
  manners: "Jonah",
};

const EXAMPLE_GIVERS: Record<string, string> = {
  alphabet: "Mom and Dad",
  numbers: "Grandma",
  "colors-shapes": "Mom and Dad",
  emotions: "Auntie Jo",
  "kindness-values": "Mom and Mama",
  "life-milestones": "Dad",
  "animals-nature": "Grandpa",
  manners: "Mom and Dad",
};

function escapeMarkup(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type TextOptions = {
  text: string;
  size: number;
  color: string;
  family?: string;
  fontfile?: string;
  width: number;
  letterSpacing?: number;
};

async function renderText(options: TextOptions): Promise<Sharp> {
  const family = options.family ?? DISPLAY_FAMILY;
  const fontfile = options.fontfile ?? DISPLAY_FONT;
  const spacing = options.letterSpacing ? ` letter_spacing="${Math.round(options.letterSpacing * 1024)}"` : "";
  const png = await sharp({
    text: {
      text: `<span foreground="${options.color}"${spacing}>${escapeMarkup(options.text)}</span>`,
      font: `${family} ${Math.round(options.size)}`,
      fontfile,
      rgba: true,
      width: Math.round(options.width),
      align: "center",
      wrap: "word",
      spacing: Math.round(options.size * 0.06),
    },
  })
    .png()
    .toBuffer();
  return sharp(png);
}

type Raster = { buffer: Buffer; width: number; height: number };

async function toRaster(image: Sharp): Promise<Raster> {
  const buffer = await image.png().toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
}

/**
 * Picture-book lettering: a cream keyline around the glyphs and a soft ink
 * shadow under them, so the title reads over whatever the scene is doing.
 * Pango cannot stroke text, so the keyline is the same glyph raster tinted
 * cream and stamped around the original.
 */
async function letteringLayer(options: TextOptions & { keyline?: number; halo?: string }): Promise<Raster> {
  const keyline = options.keyline ?? Math.max(4, Math.round(options.size * 0.075));
  const halo = options.halo ?? "#fffaf0";

  const inkRaster = await toRaster(await renderText(options));
  const keyRaster = await toRaster(await renderText({ ...options, color: halo }));

  const pad = keyline * 2 + Math.round(options.size * 0.18);
  const width = inkRaster.width + pad * 2;
  const height = inkRaster.height + pad * 2;

  const ring: OverlayOptions[] = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    ring.push({
      input: keyRaster.buffer,
      left: pad + Math.round(Math.cos(angle) * keyline),
      top: pad + Math.round(Math.sin(angle) * keyline),
    });
  }

  // Sharp has no composite opacity, so the shadow's alpha is multiplied down
  // with a dest-in wash before it is stamped under the glyphs.
  const shadow = await sharp(inkRaster.buffer)
    .ensureAlpha()
    .modulate({ brightness: 0.2 })
    .blur(Math.max(2, options.size * 0.06))
    .composite([
      {
        input: {
          create: {
            width: inkRaster.width,
            height: inkRaster.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0.45 },
          },
        },
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const composed = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left: pad, top: pad + Math.round(options.size * 0.08) },
      ...ring,
      { input: inkRaster.buffer, left: pad, top: pad },
    ])
    .png()
    .toBuffer();

  const meta = await sharp(composed).metadata();
  return { buffer: composed, width: meta.width ?? width, height: meta.height ?? height };
}

/** Small curls either side of the "and the" line, like an engraved flourish. */
function flourish(width: number, color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(width * 0.32)}" viewBox="0 0 100 32">` +
    `<path d="M4 16c14-10 26-10 34 0 5 6 12 6 18 0" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" opacity="0.85"/>` +
    `<circle cx="84" cy="16" r="5" fill="${color}" opacity="0.85"/>` +
    `</svg>`
  );
}

async function renderCover(track: Track): Promise<Buffer> {
  const childName = EXAMPLE_CHILDREN[track.slug] ?? "Sam";
  const { title } = personalizedBookCopy([{ name: childName }], track);
  const lockup = coverLockup(title);
  const dedication = dedicationLine(EXAMPLE_GIVERS[track.slug]);

  const scene = themeScene(track, { shape: "square", uid: `cover-${track.slug}` });
  const base = await sharp(Buffer.from(sceneDocument(scene)))
    .resize(COVER_SIZE, COVER_SIZE)
    .png()
    .toBuffer();

  const ink = track.art.deep;
  const layers: OverlayOptions[] = [];
  let cursor = Math.round(COVER_SIZE * 0.065);

  if (lockup.lead) {
    const lead = await letteringLayer({
      text: lockup.lead,
      size: lockup.lead.length > 9 ? 150 : 186,
      color: ink,
      width: COVER_SIZE - 120,
    });
    layers.push({
      input: lead.buffer,
      left: Math.round((COVER_SIZE - lead.width) / 2),
      top: cursor,
    });
    cursor += lead.height - Math.round(COVER_SIZE * 0.012);

    if (lockup.connector) {
      const connector = await letteringLayer({
        text: lockup.connector,
        size: 54,
        color: ink,
        width: COVER_SIZE - 400,
        keyline: 4,
      });
      const left = Math.round((COVER_SIZE - connector.width) / 2);
      layers.push({ input: connector.buffer, left, top: cursor });

      const swirlWidth = 120;
      const swirl = Buffer.from(flourish(swirlWidth, ink));
      const swirlTop = cursor + Math.round(connector.height / 2 - swirlWidth * 0.16);
      layers.push({ input: await sharp(swirl).png().toBuffer(), left: left - swirlWidth - 20, top: swirlTop });
      layers.push({
        input: await sharp(swirl).flop().png().toBuffer(),
        left: left + connector.width + 20,
        top: swirlTop,
      });
      cursor += connector.height - 10;
    }
  }

  const restSize = lockup.rest.length > 18 ? 104 : lockup.rest.length > 12 ? 118 : 136;
  const rest = await letteringLayer({
    text: lockup.rest,
    size: restSize,
    color: ink,
    width: COVER_SIZE - 150,
  });
  layers.push({ input: rest.buffer, left: Math.round((COVER_SIZE - rest.width) / 2), top: cursor });

  // Dedication on a small painted banner at the foot of the cover.
  const dedicationRaster = await letteringLayer({
    text: dedication,
    size: 46,
    color: ink,
    width: COVER_SIZE - 400,
    keyline: 4,
  });
  const bannerWidth = dedicationRaster.width + 90;
  const bannerHeight = dedicationRaster.height + 6;
  const bannerTop = COVER_SIZE - bannerHeight - Math.round(COVER_SIZE * 0.05);
  const banner = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bannerWidth}" height="${bannerHeight}" viewBox="0 0 ${bannerWidth} ${bannerHeight}">` +
      `<path d="M30 6h${bannerWidth - 60}l-16 ${bannerHeight / 2 - 6} 16 ${bannerHeight / 2 - 6}H30l16-${
        bannerHeight / 2 - 6
      }z" fill="#fffaf0" opacity="0.88"/>` +
      `<path d="M30 6h${bannerWidth - 60}l-16 ${bannerHeight / 2 - 6} 16 ${bannerHeight / 2 - 6}H30l16-${
        bannerHeight / 2 - 6
      }z" fill="none" stroke="${track.art.accent}" stroke-width="3" opacity="0.7"/>` +
      `</svg>`,
  );
  layers.push({
    input: await sharp(banner).png().toBuffer(),
    left: Math.round((COVER_SIZE - bannerWidth) / 2),
    top: bannerTop,
  });
  layers.push({
    input: dedicationRaster.buffer,
    left: Math.round((COVER_SIZE - dedicationRaster.width) / 2),
    top: bannerTop + 3,
  });

  // Imprint, bottom right, the way a publisher's mark sits on a jacket.
  const imprint = await letteringLayer({
    text: "STORY KIDDO",
    size: 26,
    color: ink,
    family: SANS_FAMILY,
    fontfile: SANS_FONT,
    width: 400,
    keyline: 3,
    letterSpacing: 4,
  });
  layers.push({
    input: imprint.buffer,
    left: COVER_SIZE - imprint.width - 42,
    top: COVER_SIZE - imprint.height - 30,
  });

  return sharp(base).composite(layers).png().toBuffer();
}

/**
 * A standing hardcover seen from just off-centre: front board sheared back,
 * a page block along the fore edge, the spine turning away, and a soft shadow
 * pooled under it.
 */
async function renderMockup(track: Track, coverPng: Buffer): Promise<Buffer> {
  const width = 1100;
  const height = 1240;
  const cover = await sharp(coverPng).resize(760, 760).png().toBuffer();
  const b64 = cover.toString("base64");

  const faceLeft = 250;
  const faceTop = 130;
  const faceW = 700;
  const faceH = 760;
  const shear = 0.075;
  const spineW = 96;
  const pageW = 44;
  const ink = track.art.deep;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>` +
    `<linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${ink}" stop-opacity="0.95"/>` +
    `<stop offset="1" stop-color="${ink}" stop-opacity="0.6"/>` +
    `</linearGradient>` +
    `<linearGradient id="pages" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#fffaf0"/>` +
    `<stop offset="0.5" stop-color="#e9ddc9"/>` +
    `<stop offset="1" stop-color="#fdf6ea"/>` +
    `</linearGradient>` +
    `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/>` +
    `<stop offset="0.45" stop-color="#ffffff" stop-opacity="0.04"/>` +
    `<stop offset="1" stop-color="${ink}" stop-opacity="0.12"/>` +
    `</linearGradient>` +
    `<radialGradient id="drop" cx="0.5" cy="0.5">` +
    `<stop offset="0" stop-color="${ink}" stop-opacity="0.42"/>` +
    `<stop offset="1" stop-color="${ink}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    // Shadow pooled under the standing book.
    `<ellipse cx="${faceLeft + faceW / 2 - 30}" cy="${faceTop + faceH + 90}" rx="${faceW * 0.62}" ry="66" fill="url(#drop)"/>` +
    // Spine, turning away from the viewer.
    `<g transform="translate(${faceLeft - spineW} ${faceTop}) matrix(1,${-shear},0,1,0,0)">` +
    `<rect x="0" y="${spineW * shear}" width="${spineW}" height="${faceH}" fill="url(#spine)"/>` +
    `<rect x="${spineW - 10}" y="${spineW * shear}" width="10" height="${faceH}" fill="#000000" opacity="0.18"/>` +
    `</g>` +
    // Page block along the fore edge.
    `<g transform="translate(${faceLeft + faceW} ${faceTop}) matrix(1,${shear},0,1,0,0)">` +
    `<rect x="0" y="0" width="${pageW}" height="${faceH}" fill="url(#pages)"/>` +
    `<g opacity="0.5">` +
    Array.from({ length: 9 }, (_, i) => `<rect x="${4 + i * 4}" y="6" width="1.5" height="${faceH - 12}" fill="${ink}" opacity="0.12"/>`).join("") +
    `</g>` +
    `<path d="M0 0h${pageW}l-6 -18H6z" fill="#fdf6ea"/>` +
    `</g>` +
    // Front board: the cover art, sheared so the book stands at an angle.
    `<g transform="translate(${faceLeft} ${faceTop}) matrix(1,${shear},0,1,0,0)">` +
    `<rect x="-10" y="-10" width="${faceW + 20}" height="${faceH + 20}" rx="10" fill="${ink}" opacity="0.5"/>` +
    `<image xlink:href="data:image/png;base64,${b64}" x="0" y="0" width="${faceW}" height="${faceH}" preserveAspectRatio="none"/>` +
    `<rect x="0" y="0" width="${faceW}" height="${faceH}" fill="url(#sheen)"/>` +
    `<rect x="0" y="0" width="14" height="${faceH}" fill="${ink}" opacity="0.22"/>` +
    `</g>` +
    `</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function write(file: string, data: Buffer): Promise<void> {
  const target = path.join(OUT, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  console.log(`  ${path.relative(ROOT, target)} (${Math.round(data.length / 1024)} KB)`);
}

async function main(): Promise<void> {
  console.log("Painting cover art…");
  const covers = new Map<string, Buffer>();
  for (const track of TRACKS) {
    const cover = await renderCover(track);
    covers.set(track.slug, cover);
    await write(`covers/${track.slug}.png`, cover);
  }

  console.log("Building book mockups…");
  for (const track of TRACKS) {
    const cover = covers.get(track.slug);
    if (!cover) continue;
    await write(`mockups/${track.slug}.png`, await renderMockup(track, cover));
  }

  console.log("Painting hero art…");
  await write(
    "hero/gift-moment.png",
    await sharp(Buffer.from(giftMomentScene())).png().toBuffer(),
  );
  await write(
    "hero/book-press.png",
    await sharp(Buffer.from(pressWorkshopScene())).png().toBuffer(),
  );
}

await main();
