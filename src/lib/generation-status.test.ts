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
} from "./generation-status.ts";

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
    assert.match(component, /setTimeout/);
    assert.match(component, /generationStatusPath/);
    assert.match(component, /cache:\s*"no-store"/);
    assert.match(component, /AbortController/);
    assert.match(component, /visibilitychange/);
    assert.match(component, /document\.hidden/);
    assert.match(component, /GENERATION_STATUS_POLL_MAX_MS/);
    assert.match(page, /RefreshWhileGenerating orderId=\{order\.id\}/);
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
    assert.match(component, /shouldRefreshAfterGenerationStatus/);
    assert.match(component, /router\.refresh\(\)/);
    const refreshCalls = component.match(/router\.refresh\(\)/g) ?? [];
    assert.equal(refreshCalls.length, 1);
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
    const matches = pipeline.match(/cacheControl:\s*"3600"/g) ?? [];
    assert.equal(matches.length, 2);
    assert.match(pipeline, /upload\(masterPath, masterPng/);
    assert.match(pipeline, /upload\(previewPath, previewPng/);
    assert.doesNotMatch(pipeline, /immutable/);
    assert.doesNotMatch(pipeline, /31536000/);
  });
});
