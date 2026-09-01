/**
 * Server-side preview watermark. Applied after gpt-image-2 returns a PNG —
 * never asked of the image model, which cannot be trusted to stamp text.
 */

import sharp from "sharp";

export const PREVIEW_WATERMARK_TEXT = "STORY KIDDO PREVIEW";
export const PREVIEW_WATERMARK_OPACITY = 0.22;

export function buildWatermarkSvg(width: number, height: number): string {
  const tileWidth = 420;
  const tileHeight = 160;
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="story-kiddo-preview" patternUnits="userSpaceOnUse" width="${tileWidth}" height="${tileHeight}" patternTransform="rotate(-32)">
      <text x="12" y="88" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="white" fill-opacity="${PREVIEW_WATERMARK_OPACITY}" letter-spacing="2">${PREVIEW_WATERMARK_TEXT}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#story-kiddo-preview)"/>
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
