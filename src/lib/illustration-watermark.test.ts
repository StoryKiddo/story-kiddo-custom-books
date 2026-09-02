import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  PREVIEW_WATERMARK_FONT_RATIO,
  PREVIEW_WATERMARK_OPACITY,
  PREVIEW_WATERMARK_ROTATION,
  PREVIEW_WATERMARK_TEXT,
  applyPreviewWatermark,
  masterIllustrationObjectPath,
  previewIllustrationObjectPath,
  renderWatermarkLabel,
  renderWatermarkLayer,
  stampCustomerPreview,
  watermarkFontPath,
} from "./illustration-watermark.ts";

async function countDarkInk(png: Buffer): Promise<{ ink: number; dark: number; maxA: number }> {
  const { default: sharp } = await import("sharp");
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let ink = 0;
  let dark = 0;
  let maxA = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > maxA) maxA = a;
    if (a < 8) continue;
    ink += 1;
    if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) dark += 1;
  }
  return { ink, dark, maxA };
}

describe("preview watermark", () => {
  it("uses STORY KIDDO at 30–40% white with a mild diagonal", () => {
    assert.equal(PREVIEW_WATERMARK_TEXT, "STORY KIDDO");
    assert.ok(PREVIEW_WATERMARK_OPACITY >= 0.3 && PREVIEW_WATERMARK_OPACITY <= 0.4);
    assert.ok(PREVIEW_WATERMARK_ROTATION <= -30 && PREVIEW_WATERMARK_ROTATION >= -35);
    assert.ok(PREVIEW_WATERMARK_FONT_RATIO >= 0.05 && PREVIEW_WATERMARK_FONT_RATIO <= 0.08);
  });

  it("loads the vendored DejaVu Sans Bold file from disk", () => {
    const fontPath = watermarkFontPath();
    assert.match(fontPath, /DejaVuSans-Bold\.ttf$/);
    const bytes = readFileSync(fontPath);
    assert.ok(bytes.length > 10_000);
    assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), "\x00\x01\x00\x00");
  });

  it("rasterizes a single white label before tiling", async () => {
    const { default: sharp } = await import("sharp");
    const label = await renderWatermarkLabel(1024);
    const meta = await sharp(label).metadata();
    assert.equal(meta.channels, 4);
    assert.ok((meta.height ?? 0) >= 50, `label too short (${meta.height})`);
    assert.ok((meta.width ?? 0) >= 200, `label too narrow (${meta.width})`);
    const { ink, dark, maxA } = await countDarkInk(label);
    assert.ok(ink > 80, `label has no painted text (${ink} opaque pixels)`);
    assert.equal(dark, 0, `${dark} non-white pixels in the label`);
    assert.ok(maxA <= Math.round(255 * 0.4) + 2, `opacity too high (max alpha ${maxA})`);
    assert.ok(maxA >= Math.round(255 * 0.3) - 5, `opacity too low (max alpha ${maxA})`);
  });

  it("rasterizes a stroke-free layer with no dark bars or boxes", async () => {
    const { default: sharp } = await import("sharp");
    const layer = await renderWatermarkLayer(1024, 1536);
    const meta = await sharp(layer).metadata();
    assert.equal(meta.width, 1024);
    assert.equal(meta.height, 1536);
    assert.equal(meta.channels, 4);

    const { ink, dark, maxA } = await countDarkInk(layer);
    assert.ok(ink > 2000, `watermark layer has no painted text (${ink} opaque pixels)`);
    assert.equal(dark, 0, `${dark} dark bar pixels — missing glyphs or a stroke`);
    assert.ok(maxA <= Math.round(255 * 0.4) + 2, `opacity too high (max alpha ${maxA})`);
    assert.ok(maxA >= Math.round(255 * 0.3) - 5, `opacity too low (max alpha ${maxA})`);
  });

  it("covers square and landscape canvases without dark bars", async () => {
    for (const [width, height] of [
      [800, 800],
      [1200, 800],
    ] as const) {
      const layer = await renderWatermarkLayer(width, height);
      const { ink, dark } = await countDarkInk(layer);
      assert.ok(ink > 1000, `${width}x${height} layer has no painted text`);
      assert.equal(dark, 0, `${width}x${height} layer has ${dark} non-white pixels`);
    }
  });

  it("composites the raster layer without changing canvas size", async () => {
    const { default: sharp } = await import("sharp");
    const original = await sharp({
      create: {
        width: 200,
        height: 300,
        channels: 3,
        background: { r: 40, g: 80, b: 120 },
      },
    })
      .png()
      .toBuffer();

    const watermarked = await applyPreviewWatermark(original);
    const meta = await sharp(watermarked).metadata();
    assert.equal(meta.width, 200);
    assert.equal(meta.height, 300);
    assert.equal(meta.format, "png");
    assert.notDeepEqual(watermarked, original);
  });

  it("does not mutate the clean master buffer", async () => {
    const { default: sharp } = await import("sharp");
    const master = await sharp({
      create: {
        width: 240,
        height: 320,
        channels: 3,
        background: { r: 90, g: 140, b: 200 },
      },
    })
      .png()
      .toBuffer();
    const before = Buffer.from(master);
    const preview = await stampCustomerPreview(master);
    assert.deepEqual(master, before);
    assert.notDeepEqual(preview, master);
  });

  it("keeps preview paths distinct from the clean master", () => {
    assert.equal(masterIllustrationObjectPath("abc", 0), "abc/master/page-01.png");
    assert.equal(previewIllustrationObjectPath("abc", 0), "abc/preview/page-01.png");
    assert.notEqual(masterIllustrationObjectPath("abc", 0), previewIllustrationObjectPath("abc", 0));
  });

  it("is the post-model step illustrateBook uploads, not the raw model PNG", async () => {
    const pipeline = readFileSync(new URL("./generate-illustrations.ts", import.meta.url), "utf8");
    assert.match(pipeline, /stampCustomerPreview\(masterPng\)/);
    assert.match(pipeline, /masterIllustrationObjectPath\(options\.bookId, i\)/);
    assert.match(pipeline, /previewIllustrationObjectPath\(options\.bookId, i\)/);
    assert.match(pipeline, /upload\(masterPath, masterPng/);
    assert.match(pipeline, /upload\(previewPath, previewPng/);
    assert.match(pipeline, /illustrations\[i\] = previewPath/);
    assert.doesNotMatch(pipeline, /buildWatermarkSvg/);
    assert.doesNotMatch(pipeline, /Do not add any watermark/);

    const ui = readFileSync(new URL("../components/story-pages.tsx", import.meta.url), "utf8");
    assert.match(ui, /src=\{page\.imageUrl/);
    assert.doesNotMatch(ui, /watermark/);

    const { default: sharp } = await import("sharp");
    const modelPng = await sharp({
      create: {
        width: 400,
        height: 600,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .png()
      .toBuffer();

    const uploaded = await stampCustomerPreview(modelPng);
    const meta = await sharp(uploaded).metadata();
    assert.equal(meta.width, 400);
    assert.equal(meta.height, 600);
    assert.notDeepEqual(uploaded, modelPng);
  });
});
