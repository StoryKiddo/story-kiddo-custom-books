/**
 * Pure generation-step helpers. No Supabase client, no model calls — safe
 * for unit tests and for the order-page poller.
 */

export const GENERATION_STEPS = ["story", "cover", "page_0", "page_1"] as const;
export type GenerationStepId = (typeof GENERATION_STEPS)[number];

export type GenerationStepStatus = "pending" | "running" | "complete" | "failed" | "held";

export type GenerationPhase = "working" | "stalled" | "retryable" | "held" | "failed" | "complete";

export const GENERATION_STEP_MAX_ATTEMPTS = 3;
/**
 * Must exceed every Vercel invocation cap that can still be inside generateCover
 * / generatePage. Create is 300s; tick is 180s. Reclaim before that window ends
 * is how two workers overlap and double-bill.
 */
export const CREATE_ORDER_MAX_DURATION_SECONDS = 300;
export const GENERATION_TICK_MAX_DURATION_SECONDS = 180;
export const GENERATION_STEP_LEASE_SECONDS = 360;
export const GENERATION_RETRY_BACKOFF_SECONDS = 20;
/** Wall-clock budget for one tick / after() drain. Under the create-page 300s cap. */
export const GENERATION_DRAIN_BUDGET_MS = 240_000;

export type GenerationStepRow = {
  bookId: string;
  step: GenerationStepId;
  status: GenerationStepStatus;
  attempts: number;
  maxAttempts: number;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  nextRetryAt: string | null;
  lastError: string | null;
  artifactPath: string | null;
};

export function isGenerationStepId(value: string): value is GenerationStepId {
  return (GENERATION_STEPS as readonly string[]).includes(value);
}

export function isPaidImageStep(step: GenerationStepId): boolean {
  return step === "cover" || step === "page_0" || step === "page_1";
}

export function previewStepId(pageIndex: number): GenerationStepId | null {
  if (pageIndex === 0) return "page_0";
  if (pageIndex === 1) return "page_1";
  return null;
}

/** Matches save_book_illustration_if_lease: page_0 is index 0, page_1 is index 1. */
export function illustrationStepMatchesPage(step: string, pageIndex: number): boolean {
  return previewStepId(pageIndex) === step;
}

/**
 * Lease + step gate for writing one illustrations[] slot. Same rules as the
 * SQL RPC: the step must match the page index, and the caller must still own
 * that step's running lease.
 */
export function canSaveIllustrationIfLease(input: {
  step: string;
  pageIndex: number;
  leaseToken: string;
  owner: { step: string; leaseToken: string | null; status: string } | null;
}): boolean {
  if (!illustrationStepMatchesPage(input.step, input.pageIndex)) return false;
  if (!input.owner) return false;
  return (
    input.owner.step === input.step &&
    input.owner.status === "running" &&
    input.owner.leaseToken === input.leaseToken
  );
}

/**
 * jsonb_set equivalent: write one slot, keep every other slot (including
 * later story pages). Parallel page_0 / page_1 callers must each use this
 * against the latest array, never replace the whole column from a snapshot.
 */
export function mergeIllustrationSlot(
  illustrations: (string | null)[] | null | undefined,
  pageCount: number,
  pageIndex: number,
  previewPath: string,
): (string | null)[] {
  const length = Math.max(
    Array.isArray(illustrations) ? illustrations.length : 0,
    pageCount,
    pageIndex + 1,
  );
  const next = Array.from({ length }, (_, index) => {
    const current = Array.isArray(illustrations) ? illustrations[index] : null;
    return typeof current === "string" && current.trim() ? current : null;
  });
  next[pageIndex] = previewPath;
  return next;
}

export function stepOwnsLease(row: GenerationStepRow | undefined, leaseToken: string): boolean {
  return Boolean(row && row.status === "running" && row.leaseToken === leaseToken);
}

/**
 * POST /generation-tick may start model calls only for books this process
 * marked auto-run at create time, and never after complete/failed.
 */
export function canPubliclyResumeGeneration(book: {
  status: string;
  generationAutoRun: boolean;
}): boolean {
  if (!book.generationAutoRun) return false;
  if (book.status === "complete" || book.status === "failed") return false;
  return book.status === "pending" || book.status === "generating" || book.status === "illustrating";
}

/**
 * A remote image call that timed out may still complete and bill on the
 * provider side. Do not retry those automatically.
 */
export function isAmbiguousGenerationTimeout(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const haystack = `${name} ${message}`.toLowerCase();
  if (name === "AbortError" || name === "TimeoutError" || name === "APIConnectionTimeoutError") {
    return true;
  }
  return (
    haystack.includes("timeout") ||
    haystack.includes("timed out") ||
    haystack.includes("etimedout") ||
    haystack.includes("und_err_connect_timeout") ||
    haystack.includes("und_err_headers_timeout") ||
    haystack.includes("und_err_body_timeout") ||
    haystack.includes("deadline") ||
    (haystack.includes("aborted") && haystack.includes("timeout"))
  );
}

export function canClaimStep(row: GenerationStepRow, nowMs: number): boolean {
  if (row.status === "complete" || row.status === "held") return false;
  if (row.attempts >= row.maxAttempts) return false;
  if (row.status === "pending") return true;
  if (row.status === "running") {
    if (!row.leaseExpiresAt) return false;
    if (Date.parse(row.leaseExpiresAt) > nowMs) return false;
    // Image steps that outlived their lease are paused for review, not reclaimed.
    return row.step === "story";
  }
  if (row.status === "failed") {
    if (!row.nextRetryAt) return true;
    return Date.parse(row.nextRetryAt) <= nowMs;
  }
  return false;
}

export function shouldHoldExpiredImageLease(row: GenerationStepRow, nowMs: number): boolean {
  if (!isPaidImageStep(row.step)) return false;
  if (row.status !== "running") return false;
  if (!row.leaseExpiresAt) return true;
  return Date.parse(row.leaseExpiresAt) <= nowMs;
}

function rowByStep(
  steps: GenerationStepRow[],
): Partial<Record<GenerationStepId, GenerationStepRow>> {
  const map: Partial<Record<GenerationStepId, GenerationStepRow>> = {};
  for (const row of steps) map[row.step] = row;
  return map;
}

export function isStoryComplete(steps: GenerationStepRow[]): boolean {
  return rowByStep(steps).story?.status === "complete";
}

/**
 * One tick runs the story alone, then both preview pages together, then the
 * cover. Pages do not wait on the cover so the first picture can show earlier.
 */
export function stepsToRunThisTick(steps: GenerationStepRow[], nowMs: number): GenerationStepId[] {
  const byId = rowByStep(steps);
  const story = byId.story;
  if (story && canClaimStep(story, nowMs)) return ["story"];
  if (story && story.status !== "complete") return [];

  const pages = (["page_0", "page_1"] as const).filter((id) => {
    const row = byId[id];
    return row ? canClaimStep(row, nowMs) : false;
  });
  if (pages.length > 0) return [...pages];

  const cover = byId.cover;
  if (cover && canClaimStep(cover, nowMs)) return ["cover"];
  return [];
}

export function describeGenerationPhase(steps: GenerationStepRow[], nowMs: number): GenerationPhase {
  if (steps.length === 0) return "working";
  if (steps.every((row) => row.status === "complete")) return "complete";

  const exhausted = steps.some(
    (row) => row.status === "failed" && row.attempts >= row.maxAttempts,
  );
  if (exhausted) return "failed";

  const live = steps.some(
    (row) =>
      row.status === "running" &&
      row.leaseExpiresAt !== null &&
      Date.parse(row.leaseExpiresAt) > nowMs,
  );
  if (live) return "working";

  const held = steps.some((row) => row.status === "held");
  const claimable = steps.some((row) => canClaimStep(row, nowMs));
  if (held && !claimable) return "held";

  const retryable = steps.some(
    (row) => row.status === "failed" && row.attempts < row.maxAttempts,
  );
  if (retryable) return "retryable";

  const stalled = steps.some(
    (row) =>
      (row.status === "running" &&
        (row.leaseExpiresAt === null || Date.parse(row.leaseExpiresAt) <= nowMs)) ||
      (row.status === "pending" && !live),
  );
  if (stalled) return "stalled";

  if (held) return "held";

  return "working";
}

export function retryDelayMs(attempts: number): number {
  return Math.max(1, attempts) * GENERATION_RETRY_BACKOFF_SECONDS * 1000;
}

export type RecoveryBook = {
  id: string;
  status: string;
  pages: string[] | null;
  coverPath: string | null;
  illustrations: (string | null)[] | null;
  previewGenerated: boolean;
};

export type RecoveryArtifacts = {
  cover: boolean;
  master: boolean[];
  preview: boolean[];
};

export type RecoveryPlan = {
  orderId: string;
  bookId: string;
  wouldCallImageModel: GenerationStepId[];
  wouldCallStoryModel: boolean;
  wouldSkip: { step: GenerationStepId | "story"; reason: string }[];
  warnings: string[];
};

/**
 * What a recovery run would touch. An `illustrating` status is not proof that
 * images are missing — storage objects win. A master-only object is not a
 * finished preview.
 */
export function planRecovery(input: {
  orderId: string;
  book: RecoveryBook;
  artifacts: RecoveryArtifacts;
}): RecoveryPlan {
  const wouldCallImageModel: GenerationStepId[] = [];
  const wouldSkip: RecoveryPlan["wouldSkip"] = [];
  const warnings: string[] = [];
  const pages = input.book.pages;
  const hasStory = Array.isArray(pages) && pages.some((page) => typeof page === "string" && page.trim());

  if (hasStory) {
    wouldSkip.push({ step: "story", reason: "Story pages are already saved on the book row." });
  }

  if (input.artifacts.cover || input.book.coverPath) {
    wouldSkip.push({
      step: "cover",
      reason: input.artifacts.cover
        ? "A cover object already exists in storage."
        : "books.cover_path is already set.",
    });
  } else {
    wouldCallImageModel.push("cover");
  }

  for (const pageIndex of [0, 1] as const) {
    const step = previewStepId(pageIndex)!;
    const hasPreview = Boolean(input.artifacts.preview[pageIndex]);
    const hasMaster = Boolean(input.artifacts.master[pageIndex]);
    const hasRow = Boolean(input.book.illustrations?.[pageIndex]);
    if (hasPreview) {
      wouldSkip.push({
        step,
        reason: `Preview object for page ${pageIndex + 1} already exists in storage.`,
      });
    } else if (hasMaster) {
      wouldSkip.push({
        step,
        reason: `Master object for page ${pageIndex + 1} already exists; stamp a watermarked preview without the image model. Do not mark the page finished until that preview object is saved.`,
      });
      warnings.push(
        `Page ${pageIndex + 1} has a master-only storage object. That is not a finished customer preview.`,
      );
    } else if (hasRow) {
      wouldSkip.push({
        step,
        reason: `books.illustrations already has a path for page ${pageIndex + 1}, but the preview object was not found. Inspect storage before charging.`,
      });
      warnings.push(
        `books.illustrations has a path for page ${pageIndex + 1} without a preview object. Do not treat the row as finished.`,
      );
    } else {
      wouldCallImageModel.push(step);
    }
  }

  if (input.book.status === "illustrating" && (input.artifacts.cover || input.artifacts.preview.some(Boolean))) {
    warnings.push(
      "books.status is illustrating, but storage already has art. Do not treat the status flag as proof that images are missing.",
    );
  }
  if (input.book.previewGenerated && wouldCallImageModel.some((step) => step.startsWith("page_"))) {
    warnings.push("preview_generated is true but a preview page still looks missing — inspect storage before charging.");
  }

  return {
    orderId: input.orderId,
    bookId: input.book.id,
    wouldCallImageModel,
    wouldCallStoryModel: !hasStory,
    wouldSkip,
    warnings,
  };
}
