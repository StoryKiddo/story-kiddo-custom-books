import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  THEME_GALLERY_HREF,
  createHrefForLaunchTrack,
  createHrefForTrack,
  themeTileHref,
} from "./track-links.ts";
import { TRACKS, customerFacingTracks, getTrackBySlug, isLaunchTrack } from "./tracks.ts";

describe("createHrefForTrack", () => {
  it("links to the personalize step with the track in the query", () => {
    assert.equal(createHrefForTrack("alphabet"), "/create?track=alphabet");
  });

  it("encodes anything that is not URL-safe", () => {
    assert.equal(createHrefForTrack("a b&c"), "/create?track=a%20b%26c");
  });
});

describe("themeTileHref", () => {
  it("sends every catalog theme straight to its create page", () => {
    for (const track of TRACKS) {
      assert.equal(themeTileHref(track), `/create?track=${track.slug}`);
    }
  });

  it("never routes a tile back through the gallery step", () => {
    for (const track of TRACKS) {
      const href = themeTileHref(track);
      assert.equal(href.startsWith(`${THEME_GALLERY_HREF}`), false);
      assert.equal(href.startsWith("/create?"), true);
    }
  });

  it("produces a track param the create page can resolve", () => {
    for (const track of TRACKS) {
      const slug = new URL(
        themeTileHref(track),
        "https://storykiddo.test",
      ).searchParams.get("track");
      assert.equal(getTrackBySlug(slug)?.slug, track.slug);
    }
  });
});

describe("launch catalog", () => {
  it("ships only the Alphabet book to customers", () => {
    assert.deepEqual(
      customerFacingTracks().map((track) => track.slug),
      ["alphabet"],
    );
    assert.equal(isLaunchTrack("alphabet"), true);
    assert.equal(isLaunchTrack("numbers"), false);
    assert.equal(createHrefForLaunchTrack(), "/create?track=alphabet");
  });
});
