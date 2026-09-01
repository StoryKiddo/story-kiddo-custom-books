import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTrackBySlug } from "./tracks.ts";
import {
  ALPHABET_LETTERS,
  ALPHABET_PAGE_COUNT,
  buildStoryPrompt,
  missingAlphabetLetters,
} from "./story-prompt.ts";

const alphabet = getTrackBySlug("alphabet")!;
const numbers = getTrackBySlug("numbers")!;

describe("story prompt age bands", () => {
  it("writes to the youngest child, not the theme age-range ceiling", () => {
    const prompt = buildStoryPrompt(numbers, [
      { name: "Ava", age: 8 },
      { name: "Sam", age: 2 },
    ]);
    assert.match(prompt, /age 2/);
    assert.match(prompt, /toddler/i);
    assert.doesNotMatch(prompt, /YOUNGEST age in that range/);
  });
});

describe("alphabet letter coverage", () => {
  it("counts a page when the first word starts with the assigned letter", () => {
    const pages = ALPHABET_LETTERS.map((letter) => {
      if (letter === "A") return "An adventure begins at dawn.";
      if (letter === "B") return "Behind his tree, Dylan waits.";
      return `${letter} is for something starring Dylan.`;
    });
    assert.equal(pages.length, ALPHABET_PAGE_COUNT);
    assert.deepEqual(missingAlphabetLetters(pages), []);
  });

  it("flags a page that never features its letter", () => {
    const pages = ALPHABET_LETTERS.map(() => "The same sentence on every page.");
    assert.ok(missingAlphabetLetters(pages).includes("Q"));
    assert.ok(missingAlphabetLetters(pages).includes("A"));
  });
});

describe("alphabet continuous narrative", () => {
  it("asks for one 26-page story instead of disconnected vocabulary cards", () => {
    const prompt = buildStoryPrompt(alphabet, [{ name: "Dylan", age: 6 }]);
    assert.match(prompt, /EXACTLY 26 pages/);
    assert.match(prompt, /ONE continuous story/);
    assert.doesNotMatch(prompt, /A is for ant/);
  });
});
