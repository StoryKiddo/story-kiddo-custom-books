import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PREVIEW_WATERMARK_OPACITY,
  PREVIEW_WATERMARK_TEXT,
  applyPreviewWatermark,
  buildWatermarkSvg,
  stampCustomerPreview,
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
    assert.match(svg, /stroke="#1a1410"/);
    assert.match(svg, /@font-face/);
    assert.match(svg, /StoryKiddoWm/);
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

  it("stays unmistakable on a light page like gpt-image-2 story art", async () => {
    const { default: sharp } = await import("sharp");
    const original = await sharp({
      create: {
        width: 320,
        height: 480,
        channels: 3,
        background: { r: 245, g: 235, b: 210 },
      },
    })
      .png()
      .toBuffer();

    const watermarked = await applyPreviewWatermark(original);
    const before = await sharp(original).removeAlpha().raw().toBuffer();
    const after = await sharp(watermarked).removeAlpha().raw().toBuffer();
    let maxDelta = 0;
    for (let i = 0; i < before.length; i++) {
      const delta = Math.abs(after[i] - before[i]);
      if (delta > maxDelta) maxDelta = delta;
    }
    assert.ok(
      maxDelta >= 50,
      `white-on-cream watermark was effectively invisible (max channel delta ${maxDelta})`,
    );
  });

  it("is the post-model step illustrateBook uploads, not the raw model PNG", async () => {
    const { readFileSync } = await import("node:fs");
    const pipeline = readFileSync(new URL("./generate-illustrations.ts", import.meta.url), "utf8");
    assert.match(pipeline, /stampCustomerPreview\(png\)/);
    assert.doesNotMatch(pipeline, /applyPreviewWatermark\(png\)/);

    const { default: sharp } = await import("sharp");
    const modelPng = await sharp({
      create: {
        width: 1024,
        height: 1536,
        channels: 3,
        background: { r: 245, g: 235, b: 210 },
      },
    })
      .composite([
        {
          input: Buffer.from(`<svg width="1024" height="1536" xmlns="http://www.w3.org/2000/svg">
            <rect x="80" y="100" width="860" height="480" rx="40" fill="#fff6e4"/>
            <circle cx="300" cy="980" r="200" fill="#f2a65a"/>
            <circle cx="740" cy="1080" r="240" fill="#7eb8da"/>
          </svg>`),
          blend: "over",
        },
      ])
      .png()
      .toBuffer();

    const uploaded = await stampCustomerPreview(modelPng);
    const meta = await sharp(uploaded).metadata();
    assert.equal(meta.width, 1024);
    assert.equal(meta.height, 1536);
    assert.notDeepEqual(uploaded, modelPng);
  });
});
