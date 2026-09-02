/**
 * Server-side preview watermark. Applied after gpt-image-2 returns a PNG —
 * never asked of the image model.
 *
 * Pipeline:
 *   1. Rasterize one "STORY KIDDO" label with Sharp's pango `text` input and
 *      an explicit `fontfile` (vendored DejaVu Sans Bold).
 *   2. Force the glyphs to white at ~35% opacity.
 *   3. Tile, rotate, and crop that raster onto a transparent PNG the same
 *      size as the illustration.
 *   4. Composite the PNG layer over the clean illustration with Sharp.
 *
 * SVG `<text>` is not used. The previous overlay embedded SVG text plus a
 * dark stroke; when the font failed to load, those strokes painted the
 * missing-glyph boxes as gray/black rectangular bars.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const PREVIEW_WATERMARK_TEXT = "STORY KIDDO";
export const PREVIEW_WATERMARK_OPACITY = 0.35;
export const PREVIEW_WATERMARK_ROTATION = -32;
/** Letter height as a fraction of image width (5–8%). */
export const PREVIEW_WATERMARK_FONT_RATIO = 0.07;
const FONT_FILENAME = "DejaVuSans-Bold.ttf";

export function watermarkFontPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "fonts", FONT_FILENAME),
    path.join(process.cwd(), "src/lib/fonts", FONT_FILENAME),
    path.join(process.cwd(), "fonts", FONT_FILENAME),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Preview watermark font is missing from the server bundle.");
  }
  return found;
}

export function masterIllustrationObjectPath(bookId: string, pageIndex: number): string {
  return `${bookId}/master/page-${String(pageIndex + 1).padStart(2, "0")}.png`;
}

export function previewIllustrationObjectPath(bookId: string, pageIndex: number): string {
  return `${bookId}/preview/page-${String(pageIndex + 1).padStart(2, "0")}.png`;
}

async function dumpDebugAsset(name: string, png: Buffer): Promise<void> {
  const dir = process.env.WATERMARK_DEBUG_DIR?.trim();
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), png);
}

async function inspectGlyphs(png: Buffer): Promise<{ ink: number; darkBars: number; maxA: number }> {
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let ink = 0;
  let darkBars = 0;
  let maxA = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > maxA) maxA = a;
    if (a < 8) continue;
    ink += 1;
    // Missing-glyph tofu and the old SVG stroke rendered as near-black bars.
    if (data[i] < 40 && data[i + 1] < 40 && data[i + 2] < 40) darkBars += 1;
  }
  return { ink, darkBars, maxA };
}

async function assertReadableWatermark(png: Buffer, what: string): Promise<void> {
  const { ink, darkBars, maxA } = await inspectGlyphs(png);
  if (ink < 80) {
    throw new Error(`${what} rendered without readable STORY KIDDO glyphs.`);
  }
  if (darkBars > 0) {
    throw new Error(`${what} contains ${darkBars} dark bar pixels.`);
  }
  const minA = Math.round(255 * 0.3) - 8;
  const maxAllowed = Math.round(255 * 0.4) + 8;
  if (maxA < minA || maxA > maxAllowed) {
    throw new Error(`${what} opacity is out of range (max alpha ${maxA}).`);
  }
}

export async function renderWatermarkLabel(pageWidth: number): Promise<Buffer> {
  const fontfile = watermarkFontPath();
  const targetHeight = Math.max(16, Math.round(pageWidth * PREVIEW_WATERMARK_FONT_RATIO));
  const pointSize = Math.max(12, Math.round(targetHeight * 1.32));

  // Plain text only — no pango markup, no SVG. Size comes from the pango
  // font description; glyphs come from the vendored TTF via `fontfile`.
  const sized = await sharp({
    text: {
      text: PREVIEW_WATERMARK_TEXT,
      font: `DejaVu Sans Bold ${pointSize}`,
      fontfile,
      dpi: 72,
      rgba: true,
    },
  })
    .png()
    .toBuffer();

  const meta = await sharp(sized).metadata();
  if (!meta.width || !meta.height || meta.height < 8 || meta.width < 24) {
    throw new Error("Watermark label failed to render readable STORY KIDDO text.");
  }

  // Force RGB to white and scale alpha to ~35%, regardless of pango's default
  // fill (often black). Black glyphs would look like the old dark bars.
  const label = await sharp(sized)
    .linear([0, 0, 0, PREVIEW_WATERMARK_OPACITY], [255, 255, 255, 0])
    .png()
    .toBuffer();

  await assertReadableWatermark(label, "Watermark label");
  await dumpDebugAsset(`watermark-label-${pageWidth}.png`, label);
  return label;
}

export async function renderWatermarkLayer(width: number, height: number): Promise<Buffer> {
  const label = await renderWatermarkLabel(width);
  const labelMeta = await sharp(label).metadata();
  const lw = labelMeta.width ?? 1;
  const lh = labelMeta.height ?? 1;

  const colGap = Math.round(lw * 0.65);
  const rowGap = Math.round(lh * 2.4);
  const cellW = lw + colGap;
  const cellH = lh + rowGap;

  const tile = Math.ceil(Math.hypot(width, height) * 1.55);
  const composites: { input: Buffer; left: number; top: number }[] = [];
  let row = 0;
  for (let y = -cellH; y < tile + cellH; y += cellH, row += 1) {
    const xOff = row % 2 === 1 ? Math.round(cellW / 2) : 0;
    for (let x = -cellW + xOff; x < tile + cellW; x += cellW) {
      composites.push({ input: label, left: Math.round(x), top: Math.round(y) });
    }
  }

  const tiled = await sharp({
    create: {
      width: tile,
      height: tile,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const rotated = await sharp(tiled)
    .rotate(PREVIEW_WATERMARK_ROTATION, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rotatedMeta = await sharp(rotated).metadata();
  const rw = rotatedMeta.width ?? tile;
  const rh = rotatedMeta.height ?? tile;
  const left = Math.max(0, Math.round((rw - width) / 2));
  const top = Math.max(0, Math.round((rh - height) / 2));

  const layer = await sharp(rotated)
    .extract({
      left: Math.min(left, Math.max(0, rw - width)),
      top: Math.min(top, Math.max(0, rh - height)),
      width,
      height,
    })
    .png()
    .toBuffer();

  await assertReadableWatermark(layer, "Watermark layer");
  await dumpDebugAsset(`watermark-layer-${width}x${height}.png`, layer);
  return layer;
}

export async function applyPreviewWatermark(png: Buffer): Promise<Buffer> {
  const image = sharp(png);
  const { width, height } = await image.metadata();
  if (!width || !height) {
    throw new Error("Could not read illustration dimensions for the preview watermark.");
  }

  const layer = await renderWatermarkLayer(width, height);
  return image
    .composite([{ input: layer, blend: "over" }])
    .png()
    .toBuffer();
}

export async function stampCustomerPreview(modelImage: Buffer): Promise<Buffer> {
  return applyPreviewWatermark(modelImage);
}
