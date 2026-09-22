import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  GENERATION_STATUS_INITIAL_DELAY_MS,
  GENERATION_STATUS_MAX_DELAY_MS,
  GENERATION_STATUS_POLL_MAX_MS,
  GENERATION_STATUS_SELECT,
  generationStatusPath,
  isGenerationStatusPollExpired,
  isTerminalBookStatus,
  nextGenerationStatusDelayMs,
  shouldRefreshAfterGenerationStatus,
  illustrationPathsToSign,
  startGenerationStatusPoll,
} from "./generation-status.ts";

/** Minimal fake clock: records every scheduled delay and fires timers on demand. */
function createFakeClock() {
  const scheduled: number[] = [];
  const timers = new Map<number, { at: number; run: () => void }>();
  let nowMs = 0;
  let nextId = 1;

  return {
    scheduled,
    now: () => nowMs,
    setTimer(run: () => void, ms: number): number {
      const id = nextId++;
      scheduled.push(ms);
      timers.set(id, { at: nowMs + ms, run });
      return id;
    },
    clearTimer(id: number) {
      timers.delete(id);
    },
    pending: () => timers.size,
    /** Fire the earliest pending timer and drain the promises it starts. */
    async runNextTimer() {
      let earliestId: number | null = null;
      let earliestAt = Number.POSITIVE_INFINITY;
      for (const [id, timer] of timers) {
        if (timer.at < earliestAt) {
          earliestAt = timer.at;
          earliestId = id;
        }
      }
      if (earliestId === null) return false;
      const timer = timers.get(earliestId)!;
      timers.delete(earliestId);
      nowMs = timer.at;
      timer.run();
      for (let i = 0; i < 20; i++) await Promise.resolve();
      return true;
    },
  };
}

describe("generation-status endpoint contract", () => {
  it("selects only status and preview_generated", () => {
    assert.equal(GENERATION_STATUS_SELECT, "status, preview_generated");
    assert.doesNotMatch(GENERATION_STATUS_SELECT, /illustrations|pages|title/);
  });

  it("never returns illustrations, pages, or storage paths", () => {
    const route = readFileSync(
      new URL("../app/api/orders/[id]/generation-status/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /createAdminSupabaseClient/);
    assert.match(route, /GENERATION_STATUS_SELECT/);
    assert.match(route, /Cache-Control.*no-store/);
    assert.match(route, /status:\s*404/);
    assert.doesNotMatch(route, /illustrations/);
    assert.doesNotMatch(route, /\bpages\b/);
    assert.doesNotMatch(route, /createSignedUrl/);
    assert.doesNotMatch(route, /book-illustrations/);
    assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(route, /getServiceRoleKey/);
  });
});

describe("RefreshWhileGenerating poller", () => {
  const component = readFileSync(
    new URL("../components/refresh-while-generating.tsx", import.meta.url),
    "utf8",
  );
  const page = readFileSync(new URL("../app/order/[id]/page.tsx", import.meta.url), "utf8");

  it("does not call router.refresh on each timer tick", () => {
    assert.doesNotMatch(component, /setInterval/);
    assert.doesNotMatch(component, /2500/);
    assert.match(component, /startGenerationStatusPoll/);
    assert.match(component, /setTimeout/);
    assert.match(component, /generationStatusPath/);
    assert.match(component, /cache:\s*"no-store"/);
    assert.match(component, /visibilitychange/);
    assert.match(component, /document\.hidden/);
    assert.match(component, /poll\.stop\(\)/);
    assert.match(page, /RefreshWhileGenerating orderId=\{order\.id\}/);

    const poller = readFileSync(new URL("./generation-status.ts", import.meta.url), "utf8");
    assert.match(poller, /AbortController/);
    assert.match(poller, /GENERATION_STATUS_POLL_MAX_MS/);
    assert.doesNotMatch(poller, /setInterval/);
  });

  it("refreshes only on terminal or preview-ready state", () => {
    assert.equal(shouldRefreshAfterGenerationStatus({ status: "pending" }), false);
    assert.equal(shouldRefreshAfterGenerationStatus({ status: "generating" }), false);
    assert.equal(shouldRefreshAfterGenerationStatus({ status: "illustrating" }), false);
    assert.equal(shouldRefreshAfterGenerationStatus({ status: "complete" }), true);
    assert.equal(shouldRefreshAfterGenerationStatus({ status: "failed" }), true);
    assert.equal(
      shouldRefreshAfterGenerationStatus({ status: "illustrating", previewGenerated: true }),
      true,
    );
    const refreshCalls = component.match(/router\.refresh\(\)/g) ?? [];
    assert.equal(refreshCalls.length, 1);
  });

  it("schedules 5s, 10s, 20s, 30s without repeating the first delay", async () => {
    const clock = createFakeClock();
    let requests = 0;
    let refreshes = 0;

    const handle = startGenerationStatusPoll({
      fetchStatus: async () => {
        requests += 1;
        return { status: "illustrating", previewGenerated: false };
      },
      onReady: () => {
        refreshes += 1;
      },
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      now: clock.now,
    });

    assert.deepEqual(clock.scheduled, [5_000], "first poll must be scheduled once at 5s");

    for (let i = 0; i < 4; i++) {
      assert.equal(await clock.runNextTimer(), true);
    }

    assert.deepEqual(clock.scheduled, [5_000, 10_000, 20_000, 30_000, 30_000]);
    assert.equal(requests, 4);
    assert.equal(refreshes, 0);
    handle.stop();
  });

  it("stops polling after one refresh on a terminal status", async () => {
    const clock = createFakeClock();
    let requests = 0;
    let refreshes = 0;

    const handle = startGenerationStatusPoll({
      fetchStatus: async () => {
        requests += 1;
        return requests < 2
          ? { status: "illustrating", previewGenerated: false }
          : { status: "complete", previewGenerated: true };
      },
      onReady: () => {
        refreshes += 1;
      },
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      now: clock.now,
    });

    await clock.runNextTimer();
    await clock.runNextTimer();

    assert.equal(refreshes, 1);
    assert.equal(requests, 2);
    assert.equal(clock.pending(), 0, "no further polls may be scheduled after refreshing");
    assert.equal(await clock.runNextTimer(), false);
    handle.stop();
  });

  it("keeps backing off after a failed poll instead of retrying rapidly", async () => {
    const clock = createFakeClock();
    let refreshes = 0;

    const handle = startGenerationStatusPoll({
      fetchStatus: async () => {
        throw new Error("network down");
      },
      onReady: () => {
        refreshes += 1;
      },
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      now: clock.now,
    });

    for (let i = 0; i < 3; i++) await clock.runNextTimer();

    assert.deepEqual(clock.scheduled, [5_000, 10_000, 20_000, 30_000]);
    assert.equal(refreshes, 0);
    handle.stop();
  });

  it("pauses while hidden and stops scheduling after 30 minutes", async () => {
    const clock = createFakeClock();
    let hidden = false;
    let requests = 0;

    const handle = startGenerationStatusPoll({
      fetchStatus: async () => {
        requests += 1;
        return { status: "generating", previewGenerated: false };
      },
      onReady: () => {},
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      now: clock.now,
      isHidden: () => hidden,
    });

    hidden = true;
    handle.pause();
    assert.equal(clock.pending(), 0);
    assert.equal(await clock.runNextTimer(), false);
    assert.equal(requests, 0);

    hidden = false;
    handle.resume();
    assert.equal(await clock.runNextTimer(), true);
    assert.equal(requests, 1);

    // Past the 30-minute budget the poller stops scheduling and stays usable.
    while (await clock.runNextTimer()) {
      if (clock.now() > GENERATION_STATUS_POLL_MAX_MS + 60_000) break;
    }
    assert.equal(clock.pending(), 0);
    handle.stop();
  });

  it("backs off from 5s to 10s to 20s, capped at 30s, and expires after 30 minutes", () => {
    assert.equal(nextGenerationStatusDelayMs(0), GENERATION_STATUS_INITIAL_DELAY_MS);
    assert.equal(nextGenerationStatusDelayMs(5_000), 10_000);
    assert.equal(nextGenerationStatusDelayMs(10_000), 20_000);
    assert.equal(nextGenerationStatusDelayMs(20_000), GENERATION_STATUS_MAX_DELAY_MS);
    assert.equal(nextGenerationStatusDelayMs(30_000), GENERATION_STATUS_MAX_DELAY_MS);
    assert.equal(GENERATION_STATUS_POLL_MAX_MS, 30 * 60 * 1000);
    assert.equal(isGenerationStatusPollExpired(0, 30 * 60 * 1000), true);
    assert.equal(isGenerationStatusPollExpired(0, 30 * 60 * 1000 - 1), false);
    assert.equal(generationStatusPath("abc/def"), "/api/orders/abc%2Fdef/generation-status");
  });
});

describe("getOrderSummary signed URLs", () => {
  it("does not create signed illustration URLs for a non-terminal book", () => {
    const paths = ["book/preview/page-01.png", "book/preview/page-02.png"];
    assert.equal(illustrationPathsToSign("pending", paths), null);
    assert.equal(illustrationPathsToSign("generating", paths), null);
    assert.equal(illustrationPathsToSign("illustrating", paths), null);
    assert.equal(isTerminalBookStatus("pending"), false);
    assert.equal(isTerminalBookStatus("generating"), false);
    assert.equal(isTerminalBookStatus("illustrating"), false);
  });

  it("signs only after the book is complete or failed", () => {
    const paths = ["book/preview/page-01.png", null, "book/preview/page-03.png"];
    assert.deepEqual(illustrationPathsToSign("complete", paths), paths);
    assert.deepEqual(illustrationPathsToSign("failed", paths), paths);
    assert.equal(isTerminalBookStatus("complete"), true);
    assert.equal(isTerminalBookStatus("failed"), true);

    const orders = readFileSync(new URL("./orders.ts", import.meta.url), "utf8");
    assert.match(orders, /illustrationPathsToSign\(bookStatus/);
    assert.doesNotMatch(
      orders,
      /illustrationUrls = await signIllustrationUrls\(\s*asIllustrationPaths/,
    );
  });
});

describe("illustration upload cache headers", () => {
  it("sets a one-hour cacheControl on master and preview uploads", () => {
    const pipeline = readFileSync(new URL("./generate-illustrations.ts", import.meta.url), "utf8");
    const cacheHeaders = pipeline.match(/cacheControl:\s*"3600"/g) ?? [];
    const uploads = pipeline.match(/\.upload\(/g) ?? [];
    // Every upload — cover, master, and preview — expires with the signed URL.
    assert.equal(cacheHeaders.length, uploads.length);
    assert.match(pipeline, /upload\(masterPath, masterPng/);
    assert.match(pipeline, /upload\(previewPath, previewPng/);
    assert.match(pipeline, /upload\(coverPath, cover\.png/);
    assert.doesNotMatch(pipeline, /immutable/);
    assert.doesNotMatch(pipeline, /31536000/);
    assert.doesNotMatch(pipeline, /accepting the cover as painted/);
    assert.match(pipeline, /CoverVerificationError/);
    assert.match(pipeline, /shouldSaveGeneratedCover/);
  });
});
