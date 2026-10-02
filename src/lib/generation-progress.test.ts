import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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

  it("does not promise a hard stop after a number of minutes", () => {
    const copy = generationExpectation("working");
    assert.doesNotMatch(copy, /5 minutes/);
    assert.doesNotMatch(copy, /we stop and tell you/i);
    assert.doesNotMatch(copy, /star|review|deliver|ship/i);
    assert.match(generationExpectation("stalled"), /stalled/i);
    assert.match(generationExpectation("retryable"), /try that step again/i);
    assert.match(generationExpectation("held"), /paused/i);
    assert.match(generationExpectation("failed"), /order is saved/i);
  });

  it("only calls a wait long after ten minutes, and that is not a kill switch", () => {
    assert.equal(isOverGenerationLimit(10 * 60 * 1000 - 1), false);
    assert.equal(isOverGenerationLimit(10 * 60 * 1000 + 1), true);
  });
});
