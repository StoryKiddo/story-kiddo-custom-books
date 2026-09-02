/**
 * Server-side preview watermark. Applied after gpt-image-2 returns a PNG —
 * never asked of the image model, which cannot be trusted to stamp text.
 *
 * The overlay embeds its own font so serverless hosts without system fonts
 * still render "STORY KIDDO". White 40% fill is paired with a dark stroke
 * so the mark stays visible on the bright pages that model produces.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const PREVIEW_WATERMARK_TEXT = "STORY KIDDO";
export const PREVIEW_WATERMARK_OPACITY = 0.4;
export const PREVIEW_WATERMARK_REPEAT = 3;
/** Fraction of the illustration's shorter edge. */
const FONT_SIZE_RATIO = 0.28;
const FONT_FILENAME = "DejaVuSans-Bold.ttf";

let cachedFontCss: string | null = null;

function watermarkFontPath(): string {
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

function watermarkFontFaceCss(): string {
  if (cachedFontCss) return cachedFontCss;
  const bytes = readFileSync(watermarkFontPath());
  cachedFontCss = `@font-face{font-family:StoryKiddoWm;src:url('data:font/ttf;base64,${bytes.toString("base64")}') format('truetype');font-weight:700;}`;
  return cachedFontCss;
}

export function buildWatermarkSvg(width: number, height: number): string {
  const fontSize = Math.round(Math.min(width, height) * FONT_SIZE_RATIO);
  const cx = width / 2;
  const cy = height / 2;
  const lineGap = Math.max(fontSize * 1.7, height * 0.26);
  const strokeWidth = Math.max(4, Math.round(fontSize * 0.07));
  const marks = Array.from({ length: PREVIEW_WATERMARK_REPEAT }, (_, index) => {
    const offset = index - (PREVIEW_WATERMARK_REPEAT - 1) / 2;
    const y = cy + offset * lineGap;
    return `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle">${PREVIEW_WATERMARK_TEXT}</text>`;
  });

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><style type="text/css">${watermarkFontFaceCss()}</style></defs>
  <g transform="rotate(-32 ${cx} ${cy})"
     font-family="StoryKiddoWm, DejaVu Sans, sans-serif"
     font-size="${fontSize}"
     font-weight="700"
     fill="white"
     fill-opacity="${PREVIEW_WATERMARK_OPACITY}"
     stroke="#1a1410"
     stroke-opacity="0.55"
     stroke-width="${strokeWidth}"
     paint-order="stroke fill"
     letter-spacing="${Math.round(fontSize * 0.02)}">
    ${marks.join("\n    ")}
  </g>
</svg>`;
}

async function maxChannelDelta(original: Buffer, watermarked: Buffer): Promise<number> {
  const before = await sharp(original).removeAlpha().raw().toBuffer();
  const after = await sharp(watermarked).removeAlpha().raw().toBuffer();
  const length = Math.min(before.length, after.length);
  let max = 0;
  for (let i = 0; i < length; i++) {
    const delta = Math.abs(after[i] - before[i]);
    if (delta > max) max = delta;
  }
  return max;
}

export async function applyPreviewWatermark(png: Buffer): Promise<Buffer> {
  const image = sharp(png);
  const { width, height } = await image.metadata();
  if (!width || !height) {
    throw new Error("Could not read illustration dimensions for the preview watermark.");
  }

  return image
    .composite([{ input: Buffer.from(buildWatermarkSvg(width, height)), blend: "over" }])
    .png()
    .toBuffer();
}

/**
 * The post-model step `illustrateBook` uses before uploading: stamp the
 * preview and refuse to return an unmarked image.
 */
export async function stampCustomerPreview(modelImage: Buffer): Promise<Buffer> {
  const watermarked = await applyPreviewWatermark(modelImage);
  const delta = await maxChannelDelta(modelImage, watermarked);
  if (delta < 50) {
    throw new Error(
      `Preview watermark was not visible on the generated page (max channel delta ${delta}).`,
    );
  }
  return watermarked;
}
