import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coverLockup, dedicationLine, personalizedBookCopy } from "./book-title.ts";
import {
  COVER_CUSTOMER_RETRY_MESSAGE,
  COVER_PROOF_EXTRA_TEXT,
  COVER_PROOF_UNREADABLE,
  COVER_PROOF_UNVERIFIED,
  CoverVerificationError,
  MAX_COVER_ATTEMPTS,
  buildCoverPrompt,
  coverObjectPath,
  coverPassesProof,
  coverProofIssues,
  decideCoverAttempt,
  isCoverVerificationError,
  letteringStyleFor,
  normalizeForProof,
  repaintNote,
  shouldRepaintCover,
  shouldSaveGeneratedCover,
} from "./cover-prompt.ts";
import { TRACKS, getTrackBySlug } from "./tracks.ts";

const track = getTrackBySlug("alphabet")!;
const children = [{ name: "Mia", age: 4, photoPath: "c/1.jpg" }];
const lockup = coverLockup(personalizedBookCopy([{ name: "Mia" }], track).title);
const dedication = dedicationLine("Mom and Dad");
const proofBase = { childNames: ["Mia"] as string[], lockup, dedication };

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
    assert.equal(coverPassesProof({ readText, ...proofBase }), true);
  });

  it("ignores case, accents, and punctuation in the read-back", () => {
    const readText = "MÍA and the GREAT ALPHABET QUEST! From Mom and Dad";
    assert.equal(coverPassesProof({ readText, ...proofBase }), true);
  });

  it("catches a misspelled name", () => {
    const issues = coverProofIssues({
      readText: "Mai and the Great Alphabet Quest From Mom and Dad",
      ...proofBase,
    });
    assert.ok(issues.some((issue) => /"Mia" is not spelled correctly/.test(issue)));
  });

  it("does not accept a name buried inside another word", () => {
    const issues = coverProofIssues({
      readText: "Miabelle and the Great Alphabet Quest From Mom and Dad",
      ...proofBase,
    });
    assert.ok(issues.some((issue) => /"Mia" is not spelled correctly/.test(issue)));
  });

  it("catches a missing title line", () => {
    const issues = coverProofIssues({ readText: "Mia From Mom and Dad", ...proofBase });
    assert.ok(issues.some((issue) => /Great Alphabet Quest/.test(issue)));
  });

  it("fails when the connector words are missing", () => {
    const issues = coverProofIssues({
      readText: "Mia Great Alphabet Quest From Mom and Dad",
      ...proofBase,
    });
    assert.ok(issues.some((issue) => /and the/.test(issue)));
  });

  it("fails when the dedication is missing", () => {
    const issues = coverProofIssues({
      readText: "Mia and the Great Alphabet Quest",
      ...proofBase,
    });
    assert.ok(issues.some((issue) => /dedication/.test(issue)));
    assert.ok(issues.some((issue) => /From Mom and Dad/.test(issue)));
  });

  it("fails extra or garbled visible text", () => {
    const extra = coverProofIssues({
      readText: "Mia and the Great Alphabet Quest From Mom and Dad Story Kiddo",
      ...proofBase,
    });
    assert.ok(extra.includes(COVER_PROOF_EXTRA_TEXT));

    const garbled = coverProofIssues({
      readText: "Mia and the Great Alphabet Qwest From Mom and Dad",
      ...proofBase,
    });
    assert.ok(garbled.some((issue) => /Great Alphabet Quest/.test(issue)));
    assert.ok(garbled.includes(COVER_PROOF_EXTRA_TEXT));
  });

  it("treats alphabet-block letters as scene props, not extra title text", () => {
    const readText = "Mia and the Great Alphabet Quest From Mom and Dad A B C D E";
    assert.equal(coverPassesProof({ readText, ...proofBase }), true);
  });

  it("treats a NONE transcript as unreadable, not a pass", () => {
    assert.deepEqual(coverProofIssues({ readText: "NONE", ...proofBase }), [COVER_PROOF_UNREADABLE]);
  });

  it("treats an unreadable cover as a failure", () => {
    const issues = coverProofIssues({ readText: "   ", ...proofBase });
    assert.deepEqual(issues, [COVER_PROOF_UNREADABLE]);
  });

  it("treats a proofreader outage as a failed verification, not a pass", () => {
    assert.deepEqual(coverProofIssues({ readText: null, ...proofBase }), [COVER_PROOF_UNVERIFIED]);
    assert.deepEqual(coverProofIssues({ readText: undefined, ...proofBase }), [
      COVER_PROOF_UNVERIFIED,
    ]);
    assert.equal(coverPassesProof({ readText: null, ...proofBase }), false);
    assert.equal(decideCoverAttempt(1, [COVER_PROOF_UNVERIFIED]), "retry");
    assert.equal(decideCoverAttempt(MAX_COVER_ATTEMPTS, [COVER_PROOF_UNVERIFIED]), "reject");
    assert.equal(shouldSaveGeneratedCover("retry"), false);
    assert.equal(shouldSaveGeneratedCover("reject"), false);
  });

  it("checks every child on a shared book", () => {
    const shared = coverLockup("Mia & Theo and the Great Alphabet Quest");
    const sharedBase = {
      childNames: ["Mia", "Theo"],
      lockup: shared,
      dedication,
    };
    const issues = coverProofIssues({
      readText: "Mia & Theo and the Great Alphabet Quest From Mom and Dad",
      ...sharedBase,
    });
    assert.deepEqual(issues, []);

    const bad = coverProofIssues({
      readText: "Mia & Teo and the Great Alphabet Quest From Mom and Dad",
      ...sharedBase,
    });
    assert.ok(bad.some((issue) => /Theo/.test(issue)));
  });

  it("rejects after the last attempt instead of saving an unverified cover", () => {
    const issues = ['"Mia" is not spelled correctly on the cover.'];
    assert.equal(shouldRepaintCover(1, issues), true);
    assert.equal(shouldRepaintCover(MAX_COVER_ATTEMPTS - 1, issues), true);
    assert.equal(shouldRepaintCover(MAX_COVER_ATTEMPTS, issues), false);
    assert.equal(shouldRepaintCover(1, []), false);
    assert.equal(decideCoverAttempt(1, issues), "retry");
    assert.equal(decideCoverAttempt(MAX_COVER_ATTEMPTS - 1, issues), "retry");
    assert.equal(decideCoverAttempt(MAX_COVER_ATTEMPTS, issues), "reject");
    assert.equal(decideCoverAttempt(MAX_COVER_ATTEMPTS, []), "accept");
    assert.equal(shouldSaveGeneratedCover("accept"), true);
    assert.equal(shouldSaveGeneratedCover("reject"), false);
    assert.equal(isCoverVerificationError(new CoverVerificationError(issues)), true);
    assert.match(COVER_CUSTOMER_RETRY_MESSAGE, /try creating the book again/);
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
