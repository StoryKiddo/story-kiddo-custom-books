import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coverByline, personalizedBookCopy } from "./book-title.ts";
import { TRACKS, getTrackBySlug } from "./tracks.ts";

function kids(...names: string[]) {
  return names.map((name, index) => ({ name, age: 4 + index }));
}

function wordCount(title: string): number {
  return title.trim().split(/\s+/).length;
}

const alphabet = getTrackBySlug("alphabet")!;

describe("personalizedBookCopy alphabet rules", () => {
  it("uses one child's name in a three-word title", () => {
    const copy = personalizedBookCopy(kids("Dylan"), alphabet);
    assert.equal(copy.title, "Dylan's Alphabet Adventure");
    assert.equal(copy.subtitle, null);
    assert.equal(wordCount(copy.title), 3);
  });

  it("joins two children with an ampersand and possessive on the final name", () => {
    const copy = personalizedBookCopy(kids("Dylan", "Mia"), alphabet);
    assert.equal(copy.title, "Dylan & Mia's Alphabet Adventure");
    assert.equal(copy.subtitle, null);
    assert.equal(wordCount(copy.title), 5);
  });

  it("uses Our Alphabet Adventure for three children and names every child in the subtitle", () => {
    const copy = personalizedBookCopy(kids("Dylan", "Mia", "Leo"), alphabet);
    assert.equal(copy.title, "Our Alphabet Adventure");
    assert.equal(copy.subtitle, "Starring Dylan, Mia & Leo");
    assert.ok(copy.subtitle?.includes("Dylan"));
    assert.ok(copy.subtitle?.includes("Mia"));
    assert.ok(copy.subtitle?.includes("Leo"));
  });

  it("names all four children in the subtitle", () => {
    const copy = personalizedBookCopy(
      kids("Dylan", "Mia", "Leo", "Ava"),
      alphabet,
    );
    assert.equal(copy.title, "Our Alphabet Adventure");
    assert.equal(copy.subtitle, "Starring Dylan, Mia, Leo & Ava");
    for (const name of ["Dylan", "Mia", "Leo", "Ava"]) {
      assert.ok(copy.subtitle?.includes(name), `missing ${name}`);
    }
  });

  it("preserves form order for two children", () => {
    const copy = personalizedBookCopy(kids("Mia", "Dylan"), alphabet);
    assert.equal(copy.title, "Mia & Dylan's Alphabet Adventure");
    assert.equal(copy.title.startsWith("Dylan"), false);
  });

  it("preserves form order for three or more children in the subtitle", () => {
    const copy = personalizedBookCopy(kids("Ava", "Leo", "Mia", "Dylan"), alphabet);
    assert.equal(copy.title, "Our Alphabet Adventure");
    assert.equal(copy.subtitle, "Starring Ava, Leo, Mia & Dylan");
  });

  it("trims names before formatting and does not rewrite them", () => {
    const copy = personalizedBookCopy(kids("  Dylan  "), alphabet);
    assert.equal(copy.title, "Dylan's Alphabet Adventure");
  });

  it("uses only the first word of a two-word name in a one-child title", () => {
    const copy = personalizedBookCopy(kids("  Mary Jane  "), alphabet);
    assert.equal(copy.title, "Mary's Alphabet Adventure");
    assert.equal(wordCount(copy.title), 3);
  });

  it("keeps a two-child title at five words when both names have two words", () => {
    const copy = personalizedBookCopy(
      kids("Mary Jane", "John Paul"),
      alphabet,
    );
    assert.equal(copy.title, "Mary & John's Alphabet Adventure");
    assert.equal(wordCount(copy.title), 5);
  });

  it("keeps full trimmed names in the subtitle for three or more children", () => {
    const copy = personalizedBookCopy(
      kids("  Mary Jane  ", "John Paul", "Ava Rose"),
      alphabet,
    );
    assert.equal(copy.title, "Our Alphabet Adventure");
    assert.equal(copy.subtitle, "Starring Mary Jane, John Paul & Ava Rose");
  });
});

describe("coverByline", () => {
  it("prints one child's name and age", () => {
    assert.equal(coverByline(kids("Dylan")), "Starring Dylan, age 4");
  });

  it("joins two children without ages", () => {
    assert.equal(coverByline(kids("Dylan", "Mia")), "Starring Dylan & Mia");
  });

  it("stays off the cover when the subtitle already names everyone", () => {
    assert.equal(coverByline(kids("Dylan", "Mia", "Leo")), null);
    assert.equal(coverByline(kids("Dylan", "Mia", "Leo", "Ava")), null);
  });

  it("trims whitespace and ignores empty names", () => {
    assert.equal(coverByline(kids("  Dylan  ")), "Starring Dylan, age 4");
    assert.equal(coverByline([]), null);
  });
});

describe("personalizedBookCopy every track", () => {
  const groups = [
    kids("Dylan"),
    kids("Dylan", "Mia"),
    kids("Dylan", "Mia", "Leo"),
    kids("Dylan", "Mia", "Leo", "Ava"),
  ];

  it("covers every current track slug", () => {
    assert.deepEqual(
      TRACKS.map((track) => track.slug),
      [
        "alphabet",
        "numbers",
        "colors-shapes",
        "emotions",
        "kindness-values",
        "life-milestones",
        "animals-nature",
        "manners",
      ],
    );
  });

  it("keeps every title at most five whitespace-separated words", () => {
    for (const track of TRACKS) {
      for (const children of groups) {
        const { title } = personalizedBookCopy(children, track);
        assert.ok(
          wordCount(title) <= 5,
          `${track.slug} with ${children.length} children: "${title}"`,
        );
      }
    }
  });

  it("puts every child's name in the subtitle for 3+ children on every track", () => {
    for (const track of TRACKS) {
      for (const children of groups.filter((group) => group.length >= 3)) {
        const { subtitle } = personalizedBookCopy(children, track);
        assert.ok(subtitle, `${track.slug} missing subtitle`);
        for (const child of children) {
          assert.ok(
            subtitle.includes(child.name),
            `${track.slug} subtitle "${subtitle}" missing ${child.name}`,
          );
        }
      }
    }
  });

  it("uses the track name in the title for single-word tracks", () => {
    assert.equal(
      personalizedBookCopy(kids("Dylan"), getTrackBySlug("numbers")!).title,
      "Dylan's Numbers Adventure",
    );
    assert.equal(
      personalizedBookCopy(kids("Dylan"), getTrackBySlug("emotions")!).title,
      "Dylan's Emotions Adventure",
    );
    assert.equal(
      personalizedBookCopy(kids("Dylan"), getTrackBySlug("manners")!).title,
      "Dylan's Manners Adventure",
    );
  });

  it("uses a short label for multi-word tracks so two-child titles stay within five words", () => {
    assert.equal(
      personalizedBookCopy(
        kids("Dylan", "Mia"),
        getTrackBySlug("colors-shapes")!,
      ).title,
      "Dylan & Mia's Colors Adventure",
    );
    assert.equal(
      personalizedBookCopy(
        kids("Dylan", "Mia"),
        getTrackBySlug("kindness-values")!,
      ).title,
      "Dylan & Mia's Kindness Adventure",
    );
    assert.equal(
      personalizedBookCopy(
        kids("Dylan", "Mia"),
        getTrackBySlug("life-milestones")!,
      ).title,
      "Dylan & Mia's Milestones Adventure",
    );
    assert.equal(
      personalizedBookCopy(
        kids("Dylan", "Mia"),
        getTrackBySlug("animals-nature")!,
      ).title,
      "Dylan & Mia's Animals Adventure",
    );
  });
});
