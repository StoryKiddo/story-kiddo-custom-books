/**
 * Durable generation runner. Every I/O port is injected so tests can use a
 * fake store and fake models. Production wiring lives in generation-runtime.ts.
 */

import {
  masterIllustrationObjectPath,
  previewIllustrationObjectPath,
} from "./illustration-watermark.ts";
import { coverObjectPath } from "./cover-prompt.ts";
import { previewGenerationSucceeded } from "./illustration-prompt.ts";
import {
  canClaimStep,
  describeGenerationPhase,
  isAmbiguousGenerationTimeout,
  isStoryComplete,
  shouldHoldExpiredImageLease,
  stepsToRunThisTick,
  type GenerationStepId,
  type GenerationStepRow,
} from "./generation-steps.ts";

export type { GenerationStepId, GenerationStepRow };

export type BookChildInput = {
  name: string;
  age: number;
  photoPath: string;
  interestIds: string[];
  customInterest: string | null;
  personalNote: string | null;
};

export type BookSnapshot = {
  id: string;
  orderId: string;
  status: string;
  pages: string[] | null;
  illustrations: (string | null)[] | null;
  coverPath: string | null;
  previewGenerated: boolean;
  title: string | null;
  dedication: string | null;
  storyType: string | null;
  blueprint: unknown;
  continuity: unknown;
  pagePlan: unknown;
  trackSlug: string;
  children: BookChildInput[];
};

export type GeneratedStoryResult = {
  pages: string[];
  blueprint: unknown;
  continuity: unknown;
  pagePlan: unknown;
};

export type GenerationDeps = {
  now: () => number;
  newLeaseToken: () => string;
  loadSteps: (bookId: string) => Promise<GenerationStepRow[]>;
  claimStep: (stepId: GenerationStepId) => Promise<GenerationStepRow | null>;
  completeStep: (
    stepId: GenerationStepId,
    artifactPath: string | null,
    leaseToken: string,
  ) => Promise<boolean>;
  failStep: (stepId: GenerationStepId, error: string, leaseToken: string) => Promise<boolean>;
  holdStep: (stepId: GenerationStepId, error: string, leaseToken: string) => Promise<boolean>;
  loadBook: (bookId: string) => Promise<BookSnapshot>;
  hasObject: (path: string) => Promise<boolean>;
  generateStory: (book: BookSnapshot) => Promise<GeneratedStoryResult>;
  saveStory: (
    pages: string[],
    extras: { blueprint: unknown; continuity: unknown; pagePlan: unknown },
    leaseToken: string,
  ) => Promise<boolean>;
  generateCover: (book: BookSnapshot) => Promise<Buffer>;
  uploadCover: (path: string, png: Buffer, leaseToken: string) => Promise<boolean>;
  adoptExistingCover: (path: string, leaseToken: string) => Promise<boolean>;
  generatePage: (pageIndex: number, book: BookSnapshot) => Promise<Buffer>;
  uploadPage: (
    pageIndex: number,
    previewPath: string,
    png: Buffer,
    leaseToken: string,
  ) => Promise<boolean>;
  adoptExistingPage: (
    pageIndex: number,
    previewPath: string,
    leaseToken: string,
  ) => Promise<boolean>;
  materializePreviewFromMaster: (pageIndex: number, leaseToken: string) => Promise<boolean>;
  setBookStatus: (status: "generating" | "illustrating" | "complete" | "failed") => Promise<void>;
  markPreviewGenerated: (value: boolean) => Promise<void>;
};

export type AdvanceResult = {
  ran: GenerationStepId[];
  phase: ReturnType<typeof describeGenerationPhase>;
};

function previewPathFor(bookId: string, pageIndex: number): string {
  return previewIllustrationObjectPath(bookId, pageIndex);
}

function stepIdForPage(pageIndex: number): GenerationStepId {
  return pageIndex === 0 ? "page_0" : "page_1";
}

async function finishIfReady(
  bookId: string,
  deps: GenerationDeps,
  steps: GenerationStepRow[],
): Promise<void> {
  const book = await deps.loadBook(bookId);
  const illustrations = book.illustrations ?? [];
  const pages = book.pages ?? [];
  const previewOk = previewGenerationSucceeded(illustrations, pages.length);
  if (previewOk && !book.previewGenerated) {
    await deps.markPreviewGenerated(true);
  }

  const byId: Partial<Record<GenerationStepId, GenerationStepRow>> = {};
  for (const row of steps) byId[row.step] = row;
  const latest = await deps.loadSteps(bookId);
  for (const row of latest) byId[row.step] = row;

  const exhausted = latest.some(
    (row) => row.status === "failed" && row.attempts >= row.maxAttempts,
  );
  if (exhausted) {
    await deps.setBookStatus("failed");
    return;
  }

  const coverDone = byId.cover?.status === "complete";
  if (previewOk && coverDone) {
    await deps.setBookStatus("complete");
    await deps.markPreviewGenerated(true);
  }
}

async function pauseExpiredImageLeases(bookId: string, deps: GenerationDeps): Promise<void> {
  const steps = await deps.loadSteps(bookId);
  const now = deps.now();
  await Promise.all(
    steps
      .filter((row) => shouldHoldExpiredImageLease(row, now))
      .map((row) =>
        deps.holdStep(
          row.step,
          "Ambiguous timeout: the previous worker lease expired while an image request may still have been in flight. Paused for manual review.",
          row.leaseToken ?? "",
        ),
      ),
  );
}

async function runStory(bookId: string, deps: GenerationDeps, leaseToken: string): Promise<void> {
  const book = await deps.loadBook(bookId);
  if (Array.isArray(book.pages) && book.pages.some((page) => page.trim())) {
    await deps.completeStep("story", null, leaseToken);
    await deps.setBookStatus("illustrating");
    return;
  }
  const story = await deps.generateStory(book);
  const saved = await deps.saveStory(
    story.pages,
    {
      blueprint: story.blueprint,
      continuity: story.continuity,
      pagePlan: story.pagePlan,
    },
    leaseToken,
  );
  if (!saved) return;
  const done = await deps.completeStep("story", null, leaseToken);
  if (done) await deps.setBookStatus("illustrating");
}

async function runCover(bookId: string, deps: GenerationDeps, leaseToken: string): Promise<void> {
  const path = coverObjectPath(bookId);
  if (await deps.hasObject(path)) {
    await deps.adoptExistingCover(path, leaseToken);
    await deps.completeStep("cover", path, leaseToken);
    return;
  }
  const book = await deps.loadBook(bookId);
  if (book.coverPath) {
    if (await deps.hasObject(book.coverPath)) {
      await deps.completeStep("cover", book.coverPath, leaseToken);
      return;
    }
    await deps.holdStep(
      "cover",
      "Cover path is set on the book row but the cover object was not found. Paused for manual review.",
      leaseToken,
    );
    return;
  }
  const png = await deps.generateCover(book);
  const uploaded = await deps.uploadCover(path, png, leaseToken);
  if (!uploaded) return;
  await deps.completeStep("cover", path, leaseToken);
}

async function runPage(
  bookId: string,
  pageIndex: number,
  deps: GenerationDeps,
  leaseToken: string,
): Promise<void> {
  const stepId = stepIdForPage(pageIndex);
  const previewPath = previewPathFor(bookId, pageIndex);
  const masterPath = masterIllustrationObjectPath(bookId, pageIndex);

  if (await deps.hasObject(previewPath)) {
    await deps.adoptExistingPage(pageIndex, previewPath, leaseToken);
    await deps.completeStep(stepId, previewPath, leaseToken);
    return;
  }

  if (await deps.hasObject(masterPath)) {
    const made = await deps.materializePreviewFromMaster(pageIndex, leaseToken);
    if (made && (await deps.hasObject(previewPath))) {
      await deps.completeStep(stepId, previewPath, leaseToken);
      return;
    }
    await deps.holdStep(
      stepId,
      "Master image exists but the watermarked preview object was not produced and saved. Paused for manual review.",
      leaseToken,
    );
    return;
  }

  const book = await deps.loadBook(bookId);
  if (book.illustrations?.[pageIndex]) {
    await deps.holdStep(
      stepId,
      "books.illustrations has a path but the watermarked preview object is missing. Paused for manual review.",
      leaseToken,
    );
    return;
  }

  const png = await deps.generatePage(pageIndex, book);
  const uploaded = await deps.uploadPage(pageIndex, previewPath, png, leaseToken);
  if (!uploaded) return;
  if (!(await deps.hasObject(previewPath))) {
    await deps.holdStep(
      stepId,
      "The image step finished without a saved watermarked preview object. Paused for manual review.",
      leaseToken,
    );
    return;
  }
  await deps.completeStep(stepId, previewPath, leaseToken);
}

async function runClaimedStep(
  bookId: string,
  claimed: GenerationStepRow,
  deps: GenerationDeps,
): Promise<void> {
  const stepId = claimed.step;
  const leaseToken = claimed.leaseToken ?? "";
  try {
    if (stepId === "story") await runStory(bookId, deps, leaseToken);
    else if (stepId === "cover") await runCover(bookId, deps, leaseToken);
    else if (stepId === "page_0") await runPage(bookId, 0, deps, leaseToken);
    else await runPage(bookId, 1, deps, leaseToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation step failed.";
    if (isPaidImageFailure(stepId) && isAmbiguousGenerationTimeout(error)) {
      await deps.holdStep(
        stepId,
        `Ambiguous image timeout: ${message} Paused for manual review instead of retrying.`,
        leaseToken,
      );
      return;
    }
    await deps.failStep(stepId, message, leaseToken);
  }
}

function isPaidImageFailure(stepId: GenerationStepId): boolean {
  return stepId !== "story";
}

export async function advanceGeneration(
  bookId: string,
  deps: GenerationDeps,
): Promise<AdvanceResult> {
  await pauseExpiredImageLeases(bookId, deps);

  const steps = await deps.loadSteps(bookId);
  const toRun = stepsToRunThisTick(steps, deps.now());
  const ran: GenerationStepId[] = [];

  const claimed: GenerationStepRow[] = [];
  for (const stepId of toRun) {
    const row = await deps.claimStep(stepId);
    if (row) claimed.push(row);
  }

  await Promise.all(
    claimed.map(async (row) => {
      await runClaimedStep(bookId, row, deps);
      ran.push(row.step);
    }),
  );

  const latest = await deps.loadSteps(bookId);
  if (isStoryComplete(latest)) {
    await finishIfReady(bookId, deps, latest);
  }

  return {
    ran,
    phase: describeGenerationPhase(latest, deps.now()),
  };
}

export async function drainGeneration(
  bookId: string,
  deps: GenerationDeps,
  deadlineMs: number,
): Promise<AdvanceResult> {
  const ran: GenerationStepId[] = [];
  let phase = describeGenerationPhase(await deps.loadSteps(bookId), deps.now());
  while (deps.now() < deadlineMs) {
    const result = await advanceGeneration(bookId, deps);
    ran.push(...result.ran);
    phase = result.phase;
    if (result.ran.length === 0) break;
  }
  return { ran, phase };
}

export { canClaimStep, describeGenerationPhase, stepsToRunThisTick };
export { retryDelayMs } from "./generation-steps.ts";
