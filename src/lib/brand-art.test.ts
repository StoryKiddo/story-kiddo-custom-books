import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HERO_GIFT_SRC,
  HERO_PRESS_SRC,
  PARCHMENT_SRC,
  coverSrc,
  mockupSrc,
  tileSrc,
} from "./brand-art.ts";

describe("brand art paths", () => {
  it("points Alphabet at the supplied WebP files", () => {
    assert.equal(coverSrc("alphabet"), "/brand/covers/alphabet.webp");
    assert.equal(mockupSrc("alphabet"), "/brand/mockups/alphabet.webp");
    assert.equal(tileSrc("alphabet"), "/brand/tiles/alphabet.webp");
    assert.equal(HERO_GIFT_SRC, "/brand/hero/gift-moment.webp");
    assert.equal(HERO_PRESS_SRC, "/brand/hero/book-press.webp");
    assert.equal(PARCHMENT_SRC, "/brand/panels/parchment.webp");
  });
});
