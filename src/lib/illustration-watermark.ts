/**
 * Server-side preview watermark. Applied after gpt-image-2 returns a PNG —
 * never asked of the image model, which cannot be trusted to stamp text.
 */

import sharp from "sharp";

export const PREVIEW_WATERMARK_TEXT = "STORY KIDDO";
export const PREVIEW_WATERMARK_OPACITY = 0.28;
export const PREVIEW_WATERMARK_REPEAT = 3;

export function buildWatermarkSvg(width: number, height: number): string {
  const fontSize = Math.round(Math.min(width, height) * 0.16);
  const cx = width / 2;
  const cy = height / 2;
  const lineGap = Math.max(fontSize * 1.85, height * 0.24);
  const marks = Array.from({ length: PREVIEW_WATERMARK_REPEAT }, (_, index) => {
    const offset = index - (PREVIEW_WATERMARK_REPEAT - 1) / 2;
    const y = cy + offset * lineGap;
    return `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle">${PREVIEW_WATERMARK_TEXT}</text>`;
  });

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <g transform="rotate(-28 ${cx} ${cy})"
     font-family="Arial, Helvetica, sans-serif"
     font-size="${fontSize}"
     font-weight="800"
     fill="white"
     fill-opacity="${PREVIEW_WATERMARK_OPACITY}"
     letter-spacing="${Math.round(fontSize * 0.04)}">
    ${marks.join("\n    ")}
  </g>
</svg>`;
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
