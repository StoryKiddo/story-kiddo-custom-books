import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GENERATION_LIMIT_SECONDS,
  GENERATION_STAGES,
  formatElapsed,
  generationExpectation,
  generationStage,
  isOverGenerationLimit,
} from "./generation-progress.ts";

describe("generation progress", () => {
  it("walks the stages in the order the pipeline runs them", () => {
    assert.equal(generationStage("pending").index, 0);
    assert.equal(generationStage("generating").index, 0);
    assert.equal(generationStage("illustrating").index, 1);
    assert.equal(generationStage("complete").index, GENERATION_STAGES.length);
  });

  it("marks only complete and failed as finished", () => {
    assert.equal(generationStage("generating").done, false);
    assert.equal(generationStage("illustrating").done, false);
    assert.equal(generationStage("complete").done, true);
    assert.equal(generationStage("failed").done, true);
    assert.equal(generationStage("failed").failed, true);
    assert.equal(generationStage("complete").failed, false);
  });

  it("formats elapsed time the way a person would say it", () => {
    assert.equal(formatElapsed(0), "0 seconds");
    assert.equal(formatElapsed(1_000), "1 second");
    assert.equal(formatElapsed(45_000), "45 seconds");
    assert.equal(formatElapsed(60_000), "1 minute");
    assert.equal(formatElapsed(125_000), "2 minutes 5 seconds");
    assert.equal(formatElapsed(-500), "0 seconds");
  });

  it("only quotes the limit the pipeline is actually given", () => {
    const copy = generationExpectation();
    assert.match(copy, new RegExp(`${GENERATION_LIMIT_SECONDS / 60} minutes`));
    // No invented shipping or review claims belong in this copy.
    assert.doesNotMatch(copy, /star|review|deliver|ship/i);
  });

  it("knows when generation has run past its limit", () => {
    assert.equal(isOverGenerationLimit(GENERATION_LIMIT_SECONDS * 1000 - 1), false);
    assert.equal(isOverGenerationLimit(GENERATION_LIMIT_SECONDS * 1000 + 1), true);
  });
});
