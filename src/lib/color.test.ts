import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withAlpha } from "./color.ts";
import { TRACKS } from "./tracks.ts";

describe("withAlpha", () => {
  it("expands six- and three-digit hex", () => {
    assert.equal(withAlpha("#b55b3e", 0.6), "rgba(181, 91, 62, 0.6)");
    assert.equal(withAlpha("#fff", 1), "rgba(255, 255, 255, 1)");
    assert.equal(withAlpha("241c16", 0.25), "rgba(36, 28, 22, 0.25)");
  });

  it("clamps opacity and falls back to ink on bad input", () => {
    assert.equal(withAlpha("#b55b3e", 4), "rgba(181, 91, 62, 1)");
    assert.equal(withAlpha("#b55b3e", -1), "rgba(181, 91, 62, 0)");
    assert.equal(withAlpha("not-a-color", 0.5), "rgba(36, 28, 22, 0.5)");
  });

  it("parses every theme color in the catalog", () => {
    for (const track of TRACKS) {
      for (const color of [track.cover, track.ink, ...Object.values(track.art)]) {
        assert.match(
          withAlpha(color, 0.5),
          /^rgba\(\d+, \d+, \d+, 0\.5\)$/,
          `${track.slug} has an unparseable color: ${color}`,
        );
      }
    }
  });
});
