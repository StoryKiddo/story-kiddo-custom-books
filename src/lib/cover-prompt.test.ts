import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coverLockup, dedicationLine, personalizedBookCopy } from "./book-title.ts";
import {
  MAX_COVER_ATTEMPTS,
  buildCoverPrompt,
  coverObjectPath,
  coverPassesProof,
  coverProofIssues,
  letteringStyleFor,
  normalizeForProof,
  repaintNote,
  shouldRepaintCover,
} from "./cover-prompt.ts";
import { TRACKS, getTrackBySlug } from "./tracks.ts";

const track = getTrackBySlug("alphabet")!;
const children = [{ name: "Mia", age: 4, photoPath: "c/1.jpg" }];
const lockup = coverLockup(personalizedBookCopy([{ name: "Mia" }], track).title);

describe("cover prompt", () => {
  it("asks for the title to be painted into the art, not typeset on top", () => {
    const prompt = buildCoverPrompt({
      track,
      children,
      lockup,
      dedication: dedicationLine("Mom and Dad"),
    });

    assert.match(prompt, /The title is part of the painting/);
    assert.match(prompt, /Do not render it as a flat computer font pasted on top/);
    assert.match(prompt, /Line 1, the largest: Mia/);
    assert.match(prompt, /Line 2, much smaller, centred: and the/);
    assert.match(prompt, /Line 3, large: Great Alphabet Quest/);
    assert.match(prompt, /From Mom and Dad/);
  });

  it("spells the child's name out so the model has no excuse", () => {
    const prompt = buildCoverPrompt({ track, children, lockup, dedication: "From Dad" });
    assert.match(prompt, /Mia is spelled M-I-A/);
    assert.match(prompt, /Spelling is critical/);
  });

  it("keeps every other kind of text off the cover", () => {
    const prompt = buildCoverPrompt({ track, children, lockup, dedication: "From Dad" });
    assert.match(prompt, /No other text anywhere/);
    assert.match(prompt, /no watermark/);
  });

  it("gives each theme its own lettering style", () => {
    const styles = TRACKS.map((entry) => letteringStyleFor(entry));
    assert.equal(new Set(styles).size, TRACKS.length);
  });

  it("names a title with no connector on a single line", () => {
    const plain = coverLockup("The Wild Woodland Wander");
    const prompt = buildCoverPrompt({ track, children, lockup: plain, dedication: "From Dad" });
    assert.match(prompt, /Line 1, large: The Wild Woodland Wander/);
    assert.doesNotMatch(prompt, /Line 2/);
  });

  it("stores the cover apart from the page illustrations", () => {
    assert.equal(coverObjectPath("book-1"), "book-1/cover/cover.png");
  });
});

describe("cover proofing", () => {
  it("passes a cover whose text reads back correctly", () => {
    const readText = "Mia\nand the\nGreat Alphabet Quest\nFrom Mom and Dad";
    assert.equal(coverPassesProof({ readText, childNames: ["Mia"], lockup }), true);
  });

  it("ignores case, accents, and punctuation in the read-back", () => {
    const readText = "MÍA and the GREAT ALPHABET QUEST!";
    assert.equal(coverPassesProof({ readText, childNames: ["Mia"], lockup }), true);
  });

  it("catches a misspelled name", () => {
    const issues = coverProofIssues({
      readText: "Mai and the Great Alphabet Quest",
      childNames: ["Mia"],
      lockup,
    });
    assert.equal(issues.length, 1);
    assert.match(issues[0], /"Mia" is not spelled correctly/);
  });

  it("does not accept a name buried inside another word", () => {
    const issues = coverProofIssues({
      readText: "Miabelle and the Great Alphabet Quest",
      childNames: ["Mia"],
      lockup,
    });
    assert.equal(issues.length, 1);
  });

  it("catches a missing title line", () => {
    const issues = coverProofIssues({ readText: "Mia", childNames: ["Mia"], lockup });
    assert.equal(issues.length, 1);
    assert.match(issues[0], /title line/);
  });

  it("treats an unreadable cover as a failure", () => {
    const issues = coverProofIssues({ readText: "   ", childNames: ["Mia"], lockup });
    assert.deepEqual(issues, ["No text could be read on the cover."]);
  });

  it("checks every child on a shared book", () => {
    const shared = coverLockup("Mia & Theo and the Great Alphabet Quest");
    const issues = coverProofIssues({
      readText: "Mia & Theo and the Great Alphabet Quest",
      childNames: ["Mia", "Theo"],
      lockup: shared,
    });
    assert.deepEqual(issues, []);

    const bad = coverProofIssues({
      readText: "Mia & Teo and the Great Alphabet Quest",
      childNames: ["Mia", "Theo"],
      lockup: shared,
    });
    assert.equal(bad.length, 1);
  });

  it("repaints while attempts are left, then gives up", () => {
    const issues = ['"Mia" is not spelled correctly on the cover.'];
    assert.equal(shouldRepaintCover(1, issues), true);
    assert.equal(shouldRepaintCover(MAX_COVER_ATTEMPTS - 1, issues), true);
    assert.equal(shouldRepaintCover(MAX_COVER_ATTEMPTS, issues), false);
    assert.equal(shouldRepaintCover(1, []), false);
  });

  it("tells the model what went wrong when repainting", () => {
    const note = repaintNote(['"Mia" is not spelled correctly on the cover.']);
    assert.match(note, /previous attempt got the lettering wrong/);
    assert.match(note, /Mia/);
  });

  it("normalizes text the same way for both sides of a comparison", () => {
    assert.equal(normalizeForProof("  Mía's  Great—Quest! "), "mia s great quest");
  });
});
