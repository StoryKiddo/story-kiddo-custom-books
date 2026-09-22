import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CREATE_ORDER_MESSAGES } from "./create-order-errors.ts";
import { resolveCreateOrderTrack } from "./create-order-track.ts";
import { isLaunchTrack } from "./tracks.ts";

describe("createOrder launch guard", () => {
  it("rejects hidden themes so a tampered track=numbers cannot create an order", () => {
    assert.equal(isLaunchTrack("numbers"), false);
    const hidden = resolveCreateOrderTrack("numbers");
    assert.deepEqual(hidden, { error: CREATE_ORDER_MESSAGES.themeNotLaunching });

    const emotions = resolveCreateOrderTrack("emotions");
    assert.deepEqual(emotions, { error: CREATE_ORDER_MESSAGES.themeNotLaunching });

    const unknown = resolveCreateOrderTrack("not-a-theme");
    assert.deepEqual(unknown, { error: CREATE_ORDER_MESSAGES.themeMissing });

    const alphabet = resolveCreateOrderTrack("alphabet");
    assert.equal("track" in alphabet, true);
    if ("track" in alphabet) {
      assert.equal(alphabet.track.slug, "alphabet");
    }
  });

  it("is used by the createOrder server action before an order is saved", () => {
    const action = readFileSync(new URL("./actions/create-order.ts", import.meta.url), "utf8");
    assert.match(action, /resolveCreateOrderTrack/);
    assert.match(action, /isLaunchTrack/);
    assert.match(action, /CREATE_ORDER_MESSAGES\.themeNotLaunching/);

    const guard = readFileSync(new URL("./create-order-track.ts", import.meta.url), "utf8");
    assert.match(guard, /isLaunchTrack/);
  });
});
