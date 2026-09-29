import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CREATE_ORDER_MAX_DURATION_SECONDS,
  GENERATION_STEP_LEASE_SECONDS,
  GENERATION_STEPS,
  GENERATION_TICK_MAX_DURATION_SECONDS,
  canClaimStep,
  canPubliclyResumeGeneration,
  canSaveIllustrationIfLease,
  describeGenerationPhase,
  isAmbiguousGenerationTimeout,
  mergeIllustrationSlot,
  planRecovery,
  shouldHoldExpiredImageLease,
  stepsToRunThisTick,
  type GenerationStepRow,
} from "./generation-steps.ts";
import {
  advanceGeneration,
  type GenerationDeps,
} from "./generation-workflow.ts";
import {
  GENERATION_STATUS_SELECT,
  illustrationPathsToSign,
  shouldRefreshAfterGenerationStatus,
} from "./generation-status.ts";

const NOW = Date.parse("2026-09-29T20:00:00.000Z");
const PAST = new Date(NOW - 60_000).toISOString();
const FUTURE = new Date(NOW + 60_000).toISOString();

function step(partial: Partial<GenerationStepRow> & Pick<GenerationStepRow, "step">): GenerationStepRow {
  return {
    bookId: "book-1",
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    leaseToken: null,
    leaseExpiresAt: null,
    nextRetryAt: null,
    lastError: null,
    artifactPath: null,
    ...partial,
  };
}

function allPending(): GenerationStepRow[] {
  return GENERATION_STEPS.map((id) => step({ step: id }));
}

describe("generation step claiming", () => {
  it("lets a pending step be claimed and rejects a live lease", () => {
    assert.equal(canClaimStep(step({ step: "cover" }), NOW), true);
    assert.equal(
      canClaimStep(
        step({
          step: "cover",
          status: "running",
          attempts: 1,
          leaseToken: "a",
          leaseExpiresAt: FUTURE,
        }),
        NOW,
      ),
      false,
    );
  });

  it("does not reclaim an expired image lease; only the story step may resume after expiry", () => {
    assert.equal(
      canClaimStep(
        step({
          step: "page_0",
          status: "running",
          attempts: 1,
          leaseToken: "old",
          leaseExpiresAt: PAST,
        }),
        NOW,
      ),
      false,
    );
    assert.equal(
      shouldHoldExpiredImageLease(
        step({
          step: "page_0",
          status: "running",
          attempts: 1,
          leaseToken: "old",
          leaseExpiresAt: PAST,
        }),
        NOW,
      ),
      true,
    );
    assert.equal(
      canClaimStep(
        step({
          step: "story",
          status: "running",
          attempts: 1,
          leaseToken: "old",
          leaseExpiresAt: PAST,
        }),
        NOW,
      ),
      true,
    );
  });

  it("does not claim a held step", () => {
    assert.equal(
      canClaimStep(step({ step: "cover", status: "held", attempts: 1, lastError: "paused" }), NOW),
      false,
    );
  });

  it("does not claim a completed step or one that exhausted retries", () => {
    assert.equal(canClaimStep(step({ step: "cover", status: "complete", attempts: 1 }), NOW), false);
    assert.equal(
      canClaimStep(
        step({
          step: "cover",
          status: "failed",
          attempts: 3,
          maxAttempts: 3,
          nextRetryAt: PAST,
        }),
        NOW,
      ),
      false,
    );
  });

  it("allows a controlled retry after failure once the backoff has elapsed", () => {
    assert.equal(
      canClaimStep(
        step({
          step: "page_1",
          status: "failed",
          attempts: 1,
          maxAttempts: 3,
          nextRetryAt: FUTURE,
        }),
        NOW,
      ),
      false,
    );
    assert.equal(
      canClaimStep(
        step({
          step: "page_1",
          status: "failed",
          attempts: 1,
          maxAttempts: 3,
          nextRetryAt: PAST,
        }),
        NOW,
      ),
      true,
    );
  });

  it("runs the story first, then both preview pages in parallel, then the cover", () => {
    assert.deepEqual(stepsToRunThisTick(allPending(), NOW), ["story"]);

    const afterStory = allPending().map((row) =>
      row.step === "story" ? { ...row, status: "complete" as const, attempts: 1 } : row,
    );
    assert.deepEqual(stepsToRunThisTick(afterStory, NOW), ["page_0", "page_1"]);

    const pagesDone = afterStory.map((row) =>
      row.step === "page_0" || row.step === "page_1"
        ? { ...row, status: "complete" as const, attempts: 1 }
        : row,
    );
    assert.deepEqual(stepsToRunThisTick(pagesDone, NOW), ["cover"]);
  });
});

describe("generation phase copy", () => {
  it("distinguishes working, stalled, retryable, held, failed, and complete", () => {
    const working = allPending().map((row) =>
      row.step === "story"
        ? {
            ...row,
            status: "running" as const,
            attempts: 1,
            leaseToken: "live",
            leaseExpiresAt: FUTURE,
          }
        : row,
    );
    assert.equal(describeGenerationPhase(working, NOW), "working");

    const stalled = working.map((row) =>
      row.step === "story" ? { ...row, leaseExpiresAt: PAST } : row,
    );
    assert.equal(describeGenerationPhase(stalled, NOW), "stalled");

    const retryable = allPending().map((row) =>
      row.step === "cover"
        ? {
            ...row,
            status: "failed" as const,
            attempts: 1,
            nextRetryAt: PAST,
          }
        : row.step === "story"
          ? { ...row, status: "complete" as const, attempts: 1 }
          : row,
    );
    assert.equal(describeGenerationPhase(retryable, NOW), "retryable");

    const held = allPending().map((row) =>
      row.step === "cover"
        ? { ...row, status: "held" as const, attempts: 1, lastError: "paused" }
        : row.step === "story"
          ? { ...row, status: "complete" as const, attempts: 1 }
          : { ...row, status: "complete" as const, attempts: 1 },
    );
    assert.equal(describeGenerationPhase(held, NOW), "held");

    const failed = allPending().map((row) =>
      row.step === "cover"
        ? { ...row, status: "failed" as const, attempts: 3, maxAttempts: 3 }
        : row.step === "story"
          ? { ...row, status: "complete" as const, attempts: 1 }
          : { ...row, status: "complete" as const, attempts: 1 },
    );
    assert.equal(describeGenerationPhase(failed, NOW), "failed");

    const complete = allPending().map((row) => ({
      ...row,
      status: "complete" as const,
      attempts: 1,
    }));
    assert.equal(describeGenerationPhase(complete, NOW), "complete");
  });
});

type MemStep = GenerationStepRow;

function createMemoryDeps(options?: {
  crashBeforeUpload?: boolean;
  crashAfterUpload?: boolean;
  artifacts?: Set<string>;
  failMaterializePreview?: boolean;
  pageError?: Error;
}): {
  deps: GenerationDeps;
  modelCalls: string[];
  artifacts: Set<string>;
  steps: Map<string, MemStep>;
  book: {
    status: string;
    pages: string[] | null;
    illustrations: (string | null)[];
    coverPath: string | null;
    previewGenerated: boolean;
  };
} {
  const steps = new Map<string, MemStep>(allPending().map((row) => [row.step, row]));
  const artifacts = options?.artifacts ?? new Set<string>();
  const modelCalls: string[] = [];
  let leaseSerial = 0;
  const book = {
    status: "generating",
    pages: null as string[] | null,
    illustrations: [null, null] as (string | null)[],
    coverPath: null as string | null,
    previewGenerated: false,
  };

  const owns = (stepId: string, leaseToken: string) => {
    const row = steps.get(stepId);
    return Boolean(row && row.status === "running" && row.leaseToken === leaseToken);
  };

  const deps: GenerationDeps = {
    now: () => NOW,
    newLeaseToken: () => `lease-${++leaseSerial}`,
    loadSteps: async () => [...steps.values()],
    claimStep: async (stepId) => {
      const row = steps.get(stepId);
      if (!row || !canClaimStep(row, NOW)) return null;
      const claimed: MemStep = {
        ...row,
        status: "running",
        attempts: row.attempts + 1,
        leaseToken: `lease-${++leaseSerial}`,
        leaseExpiresAt: FUTURE,
      };
      steps.set(stepId, claimed);
      return claimed;
    },
    completeStep: async (stepId, artifactPath, leaseToken) => {
      const row = steps.get(stepId);
      if (!row || row.status !== "running" || row.leaseToken !== leaseToken) return false;
      steps.set(stepId, {
        ...row,
        status: "complete",
        artifactPath,
        lastError: null,
        leaseToken: null,
        leaseExpiresAt: null,
      });
      return true;
    },
    failStep: async (stepId, error, leaseToken) => {
      const row = steps.get(stepId);
      if (!row || row.status !== "running" || row.leaseToken !== leaseToken) return false;
      steps.set(stepId, {
        ...row,
        status: "failed",
        lastError: error,
        nextRetryAt: FUTURE,
      });
      return true;
    },
    holdStep: async (stepId, error, leaseToken) => {
      const row = steps.get(stepId);
      if (!row || row.status !== "running" || row.leaseToken !== leaseToken) return false;
      steps.set(stepId, {
        ...row,
        status: "held",
        lastError: error,
        leaseToken: null,
        leaseExpiresAt: null,
      });
      return true;
    },
    loadBook: async () => ({
      id: "book-1",
      orderId: "order-1",
      status: book.status,
      pages: book.pages,
      illustrations: book.illustrations,
      coverPath: book.coverPath,
      previewGenerated: book.previewGenerated,
      title: "Dylan and Jack's Alphabet Adventure",
      dedication: "From Mom",
      storyType: "big_adventure",
      blueprint: {},
      continuity: {},
      pagePlan: [],
      trackSlug: "alphabet",
      children: [
        { name: "Dylan", age: 5, photoPath: "cust/dylan.jpg", interestIds: [], customInterest: null, personalNote: null },
        { name: "Jack", age: 3, photoPath: "cust/jack.jpg", interestIds: [], customInterest: null, personalNote: null },
      ],
    }),
    hasObject: async (path) => artifacts.has(path),
    generateStory: async () => {
      modelCalls.push("story");
      return {
        pages: ["page one", "page two", "page three", "page four", "page five", "page six", "page seven"],
        blueprint: {},
        continuity: {},
        pagePlan: [],
      };
    },
    saveStory: async (pages, _extras, leaseToken) => {
      if (!owns("story", leaseToken)) return false;
      book.pages = pages;
      book.status = "illustrating";
      return true;
    },
    generateCover: async () => {
      modelCalls.push("cover");
      return Buffer.from("cover");
    },
    uploadCover: async (path, _png, leaseToken) => {
      if (!owns("cover", leaseToken)) return false;
      if (options?.crashBeforeUpload) throw new Error("crash before cover upload");
      artifacts.add(path);
      if (options?.crashAfterUpload) throw new Error("crash after cover upload");
      book.coverPath = path;
      return true;
    },
    generatePage: async (pageIndex) => {
      if (options?.pageError) {
        modelCalls.push(`page_${pageIndex}`);
        throw options.pageError;
      }
      modelCalls.push(`page_${pageIndex}`);
      return Buffer.from(`page-${pageIndex}`);
    },
    uploadPage: async (pageIndex, previewPath, _png, leaseToken) => {
      const stepId = pageIndex === 0 ? "page_0" : "page_1";
      const row = steps.get(stepId);
      if (
        !canSaveIllustrationIfLease({
          step: stepId,
          pageIndex,
          leaseToken,
          owner: row
            ? { step: row.step, leaseToken: row.leaseToken, status: row.status }
            : null,
        })
      ) {
        return false;
      }
      if (options?.crashBeforeUpload) throw new Error("crash before page upload");
      artifacts.add(`book-1/master/page-0${pageIndex + 1}.png`);
      artifacts.add(previewPath);
      if (options?.crashAfterUpload) throw new Error("crash after page upload");
      book.illustrations = mergeIllustrationSlot(
        book.illustrations,
        book.pages?.length ?? 0,
        pageIndex,
        previewPath,
      );
      return true;
    },
    adoptExistingPage: async (pageIndex, previewPath, leaseToken) => {
      const stepId = pageIndex === 0 ? "page_0" : "page_1";
      const row = steps.get(stepId);
      if (
        !canSaveIllustrationIfLease({
          step: stepId,
          pageIndex,
          leaseToken,
          owner: row
            ? { step: row.step, leaseToken: row.leaseToken, status: row.status }
            : null,
        })
      ) {
        return false;
      }
      book.illustrations = mergeIllustrationSlot(
        book.illustrations,
        book.pages?.length ?? 0,
        pageIndex,
        previewPath,
      );
      return true;
    },
    adoptExistingCover: async (path, leaseToken) => {
      if (!owns("cover", leaseToken)) return false;
      book.coverPath = path;
      return true;
    },
    materializePreviewFromMaster: async (pageIndex, leaseToken) => {
      const stepId = pageIndex === 0 ? "page_0" : "page_1";
      if (!owns(stepId, leaseToken)) return false;
      const masterPath = `book-1/master/page-0${pageIndex + 1}.png`;
      const previewPath = `book-1/preview/page-0${pageIndex + 1}.png`;
      if (!artifacts.has(masterPath) || options?.failMaterializePreview) return false;
      artifacts.add(previewPath);
      book.illustrations = mergeIllustrationSlot(
        book.illustrations,
        book.pages?.length ?? 0,
        pageIndex,
        previewPath,
      );
      return true;
    },
    setBookStatus: async (status) => {
      book.status = status;
    },
    markPreviewGenerated: async (value) => {
      book.previewGenerated = value;
    },
  };

  return { deps, modelCalls, artifacts, steps, book };
}

describe("advanceGeneration crash and resume", () => {
  it("does not mark a step complete if it crashes before the image is uploaded", async () => {
    const { deps, modelCalls, book, steps } = createMemoryDeps({ crashBeforeUpload: true });
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";

    await advanceGeneration("book-1", deps);

    assert.ok(modelCalls.includes("page_0"));
    assert.equal(steps.get("page_0")?.status, "failed");
    assert.equal(book.illustrations[0], null);
    assert.equal(book.previewGenerated, false);
    assert.notEqual(book.status, "complete");
  });

  it("keeps an uploaded image after a crash and does not regenerate it on resume", async () => {
    const first = createMemoryDeps({ crashAfterUpload: true });
    first.steps.set("story", { ...first.steps.get("story")!, status: "complete", attempts: 1 });
    first.book.pages = ["one", "two"];
    first.book.status = "illustrating";

    await advanceGeneration("book-1", first.deps);
    assert.ok(first.modelCalls.includes("page_0"));
    assert.ok(first.artifacts.has("book-1/preview/page-01.png"));
    assert.equal(first.steps.get("page_0")?.status, "failed");

    const second = createMemoryDeps({ artifacts: first.artifacts });
    second.steps.set("story", { ...second.steps.get("story")!, status: "complete", attempts: 1 });
    second.steps.set("page_0", {
      ...second.steps.get("page_0")!,
      status: "failed",
      attempts: 1,
      nextRetryAt: PAST,
    });
    second.book.pages = ["one", "two"];
    second.book.status = "illustrating";

    await advanceGeneration("book-1", second.deps);
    assert.deepEqual(
      second.modelCalls.filter((call) => call === "page_0"),
      [],
      "resume must not call the image model for a page that already has storage objects",
    );
    assert.equal(second.steps.get("page_0")?.status, "complete");
    assert.equal(second.book.illustrations[0], "book-1/preview/page-01.png");
  });

  it("resumes the same order without repeating a completed story", async () => {
    const { deps, modelCalls, steps, book } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["saved story page"];
    book.status = "illustrating";

    await advanceGeneration("book-1", deps);
    assert.equal(modelCalls.includes("story"), false);
    assert.equal(book.pages?.[0], "saved story page");
  });

  it("does not start a second model call when another claimant holds the lease", async () => {
    const { deps, modelCalls, steps } = createMemoryDeps();
    steps.set("story", {
      ...steps.get("story")!,
      status: "running",
      attempts: 1,
      leaseToken: "other-tab",
      leaseExpiresAt: FUTURE,
    });

    const result = await advanceGeneration("book-1", deps);
    assert.equal(result.ran.length, 0);
    assert.deepEqual(modelCalls, []);
  });

  it("reclaims a stale lease and runs that step once", async () => {
    const { deps, modelCalls, steps } = createMemoryDeps();
    steps.set("story", {
      ...steps.get("story")!,
      status: "running",
      attempts: 1,
      leaseToken: "dead",
      leaseExpiresAt: PAST,
    });

    await advanceGeneration("book-1", deps);
    assert.deepEqual(modelCalls, ["story"]);
    assert.equal(steps.get("story")?.status, "complete");
  });

  it("stops after retries are exhausted instead of spinning", async () => {
    const { deps, modelCalls, steps, book } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    steps.set("page_0", {
      ...steps.get("page_0")!,
      status: "failed",
      attempts: 3,
      maxAttempts: 3,
      nextRetryAt: PAST,
    });
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });
    steps.set("cover", { ...steps.get("cover")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "failed";

    const result = await advanceGeneration("book-1", deps);
    assert.equal(result.ran.length, 0);
    assert.deepEqual(modelCalls, []);
    assert.equal(steps.get("page_0")?.status, "failed");
  });
});

describe("partial preview visibility", () => {
  it("signs the first finished page while the second is still in progress", () => {
    const paths = ["book-1/preview/page-01.png", null];
    assert.deepEqual(illustrationPathsToSign("illustrating", paths), paths);
    assert.equal(illustrationPathsToSign("generating", paths), null);
  });

  it("refreshes the order page when a new preview page appears, not only at the end", () => {
    assert.equal(
      shouldRefreshAfterGenerationStatus({
        status: "illustrating",
        previewGenerated: false,
        previewReadyCount: 1,
        coverReady: false,
      }),
      true,
    );
    assert.equal(
      shouldRefreshAfterGenerationStatus(
        {
          status: "illustrating",
          previewGenerated: false,
          previewReadyCount: 1,
          coverReady: false,
        },
        {
          status: "illustrating",
          previewGenerated: false,
          previewReadyCount: 1,
          coverReady: false,
        },
      ),
      false,
    );
    assert.equal(
      shouldRefreshAfterGenerationStatus({
        status: "illustrating",
        previewGenerated: false,
        previewReadyCount: 0,
        coverReady: false,
        phase: "working",
      }),
      false,
    );
  });
});

describe("recovery plan does not guess from illustrating status", () => {
  it("skips image-model calls when cover or preview objects already exist", () => {
    const plan = planRecovery({
      orderId: "2678ceb9-e58f-4ad8-b41b-fc4fd00c279d",
      book: {
        id: "book-1",
        status: "illustrating",
        pages: ["a", "b"],
        coverPath: null,
        illustrations: [null, null],
        previewGenerated: false,
      },
      artifacts: {
        cover: true,
        master: [true, false],
        preview: [true, false],
      },
    });
    assert.equal(plan.wouldCallImageModel.includes("cover"), false);
    assert.equal(plan.wouldCallImageModel.includes("page_0"), false);
    assert.deepEqual(plan.wouldCallImageModel, ["page_1"]);
    assert.ok(plan.wouldSkip.some((item) => item.step === "story"));
    assert.ok(plan.wouldSkip.some((item) => item.step === "cover"));
  });
});

describe("no public unbounded billing surface", () => {
  it("keeps GET generation-status read-only and free of storage paths", () => {
    const route = readFileSync(
      new URL("../app/api/orders/[id]/generation-status/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /GENERATION_STATUS_SELECT/);
    assert.doesNotMatch(route, /advanceGeneration/);
    assert.doesNotMatch(route, /generatePageIllustration/);
    assert.doesNotMatch(route, /illustrateBook/);
    assert.doesNotMatch(route, /OPENAI_API_KEY/);
    assert.doesNotMatch(route, /createSignedUrl/);
    assert.doesNotMatch(GENERATION_STATUS_SELECT, /illustrations|pages|title|generation_resume_token/);
  });

  it("requires a per-order resume token on the tick route and never accepts GET", () => {
    const route = readFileSync(
      new URL("../app/api/orders/[id]/generation-tick/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /export async function POST/);
    assert.doesNotMatch(route, /export async function GET/);
    assert.match(route, /resumeToken/);
    assert.match(route, /generation_resume_token/);
    assert.match(route, /generation_auto_run/);
    assert.match(route, /canPubliclyResumeGeneration/);
    assert.match(route, /timingSafeEqual|timing-safe|safeEqual/);
    assert.match(route, /maxDuration/);
    assert.doesNotMatch(route, /from\("book-illustrations"\)/);
  });

  it("does not let a page refresh call the old one-shot illustrateBook pipeline", () => {
    const createOrder = readFileSync(new URL("./actions/create-order.ts", import.meta.url), "utf8");
    assert.match(createOrder, /advanceGeneration|drainGeneration/);
    assert.doesNotMatch(createOrder, /illustrateBook\(/);
    assert.match(createOrder, /generation_auto_run:\s*true/);
  });
});

describe("old orders never auto-bill", () => {
  it("refuses public resume unless generation_auto_run is on and the book is still in progress", () => {
    assert.equal(
      canPubliclyResumeGeneration({ status: "illustrating", generationAutoRun: false }),
      false,
    );
    assert.equal(
      canPubliclyResumeGeneration({ status: "generating", generationAutoRun: false }),
      false,
    );
    assert.equal(
      canPubliclyResumeGeneration({ status: "complete", generationAutoRun: true }),
      false,
    );
    assert.equal(
      canPubliclyResumeGeneration({ status: "failed", generationAutoRun: true }),
      false,
    );
    assert.equal(
      canPubliclyResumeGeneration({ status: "generating", generationAutoRun: true }),
      true,
    );
  });

  it("seeds existing incomplete steps as held and defaults auto-run off in SQL", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20260929180000_generation_steps.sql", import.meta.url),
      "utf8",
    );
    assert.match(sql, /generation_auto_run boolean not null default false/);
    assert.match(sql, /Existing books stay false/);
    assert.match(sql, /else 'held'/);
    assert.doesNotMatch(sql, /else 'pending'/);
  });
});

describe("lease overlap and late completion", () => {
  it("keeps the generation lease longer than every Vercel invocation that can call the image model", () => {
    const createPage = readFileSync(new URL("../app/create/page.tsx", import.meta.url), "utf8");
    const tickRoute = readFileSync(
      new URL("../app/api/orders/[id]/generation-tick/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(createPage, /export const maxDuration = 300/);
    assert.match(tickRoute, /export const maxDuration = 180/);
    assert.equal(CREATE_ORDER_MAX_DURATION_SECONDS, 300);
    assert.equal(GENERATION_TICK_MAX_DURATION_SECONDS, 180);
    assert.ok(GENERATION_STEP_LEASE_SECONDS > CREATE_ORDER_MAX_DURATION_SECONDS);
    assert.ok(GENERATION_STEP_LEASE_SECONDS > GENERATION_TICK_MAX_DURATION_SECONDS);
  });

  it("does not start a second image call while a live lease is held", async () => {
    const { deps, modelCalls, steps } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    steps.set("page_0", {
      ...steps.get("page_0")!,
      status: "running",
      attempts: 1,
      leaseToken: "live-worker",
      leaseExpiresAt: FUTURE,
    });
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });
    steps.set("cover", { ...steps.get("cover")!, status: "complete", attempts: 1 });

    const result = await advanceGeneration("book-1", deps);
    assert.equal(result.ran.length, 0);
    assert.deepEqual(modelCalls, []);
  });

  it("ignores a late complete from an expired worker after a new lease is issued", async () => {
    const { deps, modelCalls, steps, book } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });

    const originalGeneratePage = deps.generatePage;
    deps.generatePage = async (pageIndex, loaded) => {
      const png = await originalGeneratePage(pageIndex, loaded);
      const current = steps.get("page_0")!;
      steps.set("page_0", {
        ...current,
        leaseToken: "newer-worker",
        attempts: current.attempts + 1,
      });
      return png;
    };

    await advanceGeneration("book-1", deps);

    assert.ok(modelCalls.includes("page_0"));
    assert.equal(steps.get("page_0")?.status, "running");
    assert.equal(steps.get("page_0")?.leaseToken, "newer-worker");
    assert.equal(book.illustrations[0], null);
    assert.equal(book.previewGenerated, false);
  });

  it("pauses an expired image lease instead of reclaiming it for another paid call", async () => {
    const { deps, modelCalls, steps, book } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";
    steps.set("page_0", {
      ...steps.get("page_0")!,
      status: "running",
      attempts: 1,
      leaseToken: "dead-worker",
      leaseExpiresAt: PAST,
    });
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });
    steps.set("cover", { ...steps.get("cover")!, status: "complete", attempts: 1 });

    const result = await advanceGeneration("book-1", deps);
    assert.equal(steps.get("page_0")?.status, "held");
    assert.equal(modelCalls.includes("page_0"), false);
    assert.equal(result.phase, "held");
  });
});

describe("master-only storage is not a finished preview", () => {
  it("does not mark a master-only page complete when the watermarked preview cannot be saved", async () => {
    const { deps, modelCalls, steps, book, artifacts } = createMemoryDeps({
      failMaterializePreview: true,
    });
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";
    artifacts.add("book-1/master/page-01.png");
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });

    await advanceGeneration("book-1", deps);

    assert.deepEqual(modelCalls, []);
    assert.equal(steps.get("page_0")?.status, "held");
    assert.equal(book.illustrations[0], null);
    assert.equal(book.previewGenerated, false);
    assert.equal(artifacts.has("book-1/preview/page-01.png"), false);
  });

  it("stamps a watermarked preview from a master without calling the image model", async () => {
    const { deps, modelCalls, steps, book, artifacts } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";
    artifacts.add("book-1/master/page-01.png");
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });

    await advanceGeneration("book-1", deps);

    assert.deepEqual(modelCalls, []);
    assert.equal(steps.get("page_0")?.status, "complete");
    assert.equal(book.illustrations[0], "book-1/preview/page-01.png");
    assert.equal(artifacts.has("book-1/preview/page-01.png"), true);
  });
});

describe("ambiguous image timeout", () => {
  it("pauses the stage for manual review instead of retrying", async () => {
    const timeout = new Error("Request timed out");
    timeout.name = "APIConnectionTimeoutError";
    assert.equal(isAmbiguousGenerationTimeout(timeout), true);

    const { deps, modelCalls, steps, book } = createMemoryDeps({ pageError: timeout });
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";
    steps.set("page_1", { ...steps.get("page_1")!, status: "complete", attempts: 1 });
    steps.set("cover", { ...steps.get("cover")!, status: "complete", attempts: 1 });

    await advanceGeneration("book-1", deps);
    assert.ok(modelCalls.includes("page_0"));
    assert.equal(steps.get("page_0")?.status, "held");
    assert.match(steps.get("page_0")?.lastError ?? "", /paused for manual review/i);

    const again = await advanceGeneration("book-1", deps);
    assert.deepEqual(
      modelCalls.filter((call) => call === "page_0"),
      ["page_0"],
    );
    assert.equal(again.ran.length, 0);
    assert.equal(steps.get("page_0")?.status, "held");
  });
});

describe("illustration slot writes do not lose a sibling page", () => {
  it("keeps both preview paths when page_0 and page_1 finish in either order", async () => {
    const start = [null, null, "later-page"] as (string | null)[];
    const orders: [number, number][] = [
      [0, 1],
      [1, 0],
    ];
    for (const order of orders) {
      let paths = start.slice();
      for (const pageIndex of order) {
        paths = mergeIllustrationSlot(
          paths,
          3,
          pageIndex,
          `book-1/preview/page-0${pageIndex + 1}.png`,
        );
      }
      assert.deepEqual(paths, [
        "book-1/preview/page-01.png",
        "book-1/preview/page-02.png",
        "later-page",
      ]);
    }

    const { deps, modelCalls, steps, book } = createMemoryDeps();
    steps.set("story", { ...steps.get("story")!, status: "complete", attempts: 1 });
    book.pages = ["one", "two"];
    book.status = "illustrating";

    await advanceGeneration("book-1", deps);

    assert.ok(modelCalls.includes("page_0"));
    assert.ok(modelCalls.includes("page_1"));
    assert.equal(steps.get("page_0")?.status, "complete");
    assert.equal(steps.get("page_1")?.status, "complete");
    assert.equal(book.illustrations[0], "book-1/preview/page-01.png");
    assert.equal(book.illustrations[1], "book-1/preview/page-02.png");
  });

  it("refuses a wrong lease or a step that does not match the page index", () => {
    const owner = { step: "page_0", leaseToken: "lease-a", status: "running" };
    assert.equal(
      canSaveIllustrationIfLease({
        step: "page_0",
        pageIndex: 0,
        leaseToken: "lease-a",
        owner,
      }),
      true,
    );
    assert.equal(
      canSaveIllustrationIfLease({
        step: "page_0",
        pageIndex: 0,
        leaseToken: "other-worker",
        owner,
      }),
      false,
    );
    assert.equal(
      canSaveIllustrationIfLease({
        step: "page_1",
        pageIndex: 0,
        leaseToken: "lease-a",
        owner: { step: "page_1", leaseToken: "lease-a", status: "running" },
      }),
      false,
    );
    assert.equal(
      canSaveIllustrationIfLease({
        step: "page_0",
        pageIndex: 1,
        leaseToken: "lease-a",
        owner,
      }),
      false,
    );

    const sql = readFileSync(
      new URL("../../supabase/migrations/20260929180000_generation_steps.sql", import.meta.url),
      "utf8",
    );
    const fnStart = sql.indexOf("create or replace function public.save_book_illustration_if_lease(");
    const fnEnd = sql.indexOf("create or replace function public.save_book_story_if_lease(");
    assert.ok(fnStart >= 0 && fnEnd > fnStart);
    const fn = sql.slice(fnStart, fnEnd);
    assert.match(fn, /for update/i);
    assert.match(fn, /jsonb_set\(/);
    assert.match(fn, /p_step is distinct from expected_step/);
    assert.match(fn, /expected_step := 'page_0'/);
    assert.match(fn, /expected_step := 'page_1'/);
    assert.match(fn, /and s\.lease_token = p_lease_token/);
    assert.match(fn, /and s\.status = 'running'/);
    assert.match(fn, /position\('\/preview\/' in p_preview_path\) = 0/);
    assert.match(fn, /position\('\/master\/' in p_preview_path\) > 0/);
    assert.doesNotMatch(fn, /result jsonb := '\[\]'/);
  });
});
