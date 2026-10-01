import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRAND_ART_DIRECTION,
  BRAND_IMAGE_SIZE,
  HERO_GIFT_SRC,
  HERO_PRESS_SRC,
  LIFESTYLE,
  PARCHMENT_SRC,
  coverSrc,
  mockupSrc,
  tileSrc,
} from "./brand-art.ts";
import { ART_STYLE } from "./illustration-prompt.ts";

describe("brand art paths", () => {
  it("points Alphabet at the supplied WebP files", () => {
    assert.equal(coverSrc("alphabet"), "/brand/covers/alphabet.webp");
    assert.equal(mockupSrc("alphabet"), "/brand/mockups/alphabet.webp");
    assert.equal(tileSrc("alphabet"), "/brand/tiles/alphabet.webp");
    assert.equal(HERO_GIFT_SRC, "/brand/hero/gift-moment.webp");
    assert.equal(HERO_PRESS_SRC, "/brand/hero/book-press.webp");
    assert.equal(PARCHMENT_SRC, "/brand/panels/parchment.webp");
  });

  it("points the homepage lifestyle photos at the supplied Alphabet photographs", () => {
    assert.equal(LIFESTYLE.momGives.src, "/brand/lifestyle/alphabet-mom-gives-book.webp");
    assert.equal(
      LIFESTYLE.grandparentsGive.src,
      "/brand/lifestyle/alphabet-grandparents-give-book.webp",
    );
    assert.equal(LIFESTYLE.parentChild.src, "/brand/lifestyle/alphabet-parent-child.webp");
    assert.equal(LIFESTYLE.bedtime.src, "/brand/lifestyle/alphabet-bedtime.webp");
    assert.equal(LIFESTYLE.hands.src, "/brand/lifestyle/alphabet-hands.webp");
    assert.equal(BRAND_IMAGE_SIZE.lifestyle.width, 1536);
    assert.equal(BRAND_IMAGE_SIZE.lifestyle.height, 1024);
    assert.equal("gift" in LIFESTYLE, false);
  });

  it("keeps brand art enchanted and customer books theme-led, same painterly craft", () => {
    assert.match(BRAND_ART_DIRECTION, /enchanted/i);
    assert.match(BRAND_ART_DIRECTION, /golden light/i);
    assert.match(BRAND_ART_DIRECTION, /mystical/i);
    assert.match(BRAND_ART_DIRECTION, /painterly/i);
    assert.match(BRAND_ART_DIRECTION, /Never plastic/i);
    assert.match(BRAND_ART_DIRECTION, /never 3D-cartoon/i);
    assert.match(BRAND_ART_DIRECTION, /match the books that are actually generated/i);

    assert.match(ART_STYLE, /painterly/i);
    assert.match(ART_STYLE, /Do not force a mystical or enchanted look/i);
    assert.doesNotMatch(ART_STYLE, /3D animated/i);
  });
});
