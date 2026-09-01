import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PREVIEW_WATERMARK_OPACITY,
  PREVIEW_WATERMARK_TEXT,
  applyPreviewWatermark,
  buildWatermarkSvg,
} from "./illustration-watermark.ts";

describe("preview watermark", () => {
  it("tiles STORY KIDDO PREVIEW in white at about 20–25% opacity", () => {
    const svg = buildWatermarkSvg(1024, 1536);
    assert.match(svg, /STORY KIDDO PREVIEW/);
    assert.equal(PREVIEW_WATERMARK_TEXT, "STORY KIDDO PREVIEW");
    assert.ok(PREVIEW_WATERMARK_OPACITY >= 0.2 && PREVIEW_WATERMARK_OPACITY <= 0.25);
    assert.match(svg, /fill="white"/);
    assert.match(svg, /fill-opacity="0\.2[0-9]?"/);
    assert.match(svg, /rotate\(-?\d+/);
    assert.match(svg, /width="1024"/);
    assert.match(svg, /height="1536"/);
  });

  it("composites the overlay onto a PNG without changing the canvas size", async () => {
    const { default: sharp } = await import("sharp");
    const original = await sharp({
      create: {
        width: 64,
        height: 96,
        channels: 3,
        background: { r: 40, g: 80, b: 120 },
      },
    })
      .png()
      .toBuffer();

    const watermarked = await applyPreviewWatermark(original);
    const meta = await sharp(watermarked).metadata();
    assert.equal(meta.width, 64);
    assert.equal(meta.height, 96);
    assert.equal(meta.format, "png");
    assert.notDeepEqual(watermarked, original);
  });
});
