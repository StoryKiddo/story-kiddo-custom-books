import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PREVIEW_WATERMARK_OPACITY,
  PREVIEW_WATERMARK_TEXT,
  applyPreviewWatermark,
  buildWatermarkSvg,
} from "./illustration-watermark.ts";

describe("preview watermark", () => {
  it("draws a few large diagonal STORY KIDDO marks, not a dense tile", () => {
    const svg = buildWatermarkSvg(1024, 1536);
    const copies = svg.match(/STORY KIDDO/g) ?? [];
    assert.equal(PREVIEW_WATERMARK_TEXT, "STORY KIDDO");
    assert.doesNotMatch(svg, /STORY KIDDO PREVIEW/);
    assert.ok(copies.length >= 2 && copies.length <= 3);
    assert.doesNotMatch(svg, /<pattern/i);
    assert.equal(PREVIEW_WATERMARK_OPACITY, 0.4);
    assert.match(svg, /fill="white"/);
    assert.match(svg, /fill-opacity="0\.4"/);
    assert.match(svg, /rotate\(-?\d+/);
    const fontSize = Number(svg.match(/font-size="(\d+)"/)?.[1]);
    // Preview images display well under 1024px wide on phones. 16% of the
    // short edge (~164px) still looked small; this must stay glance-readable.
    assert.ok(
      fontSize >= 280,
      `font-size ${fontSize} should dominate a 1024×1536 preview page`,
    );
    assert.match(svg, /font-weight="(700|800|bold)"/);
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
