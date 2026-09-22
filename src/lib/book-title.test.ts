import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DEDICATION_GIVER,
  coverByline,
  coverLockup,
  dedicationLine,
  personalizedBookCopy,
} from "./book-title.ts";
import { TRACKS, getTrackBySlug } from "./tracks.ts";

function kids(...names: string[]) {
  return names.map((name, index) => ({ name, age: 4 + index }));
}

function wordCount(title: string): number {
  return title.trim().split(/\s+/).length;
}

const alphabet = getTrackBySlug("alphabet")!;

describe("personalizedBookCopy alphabet rules", () => {
  it("names one child in the published picture-book form", () => {
    const copy = personalizedBookCopy(kids("Dylan"), alphabet);
    assert.equal(copy.title, "Dylan and the Great Alphabet Quest");
    assert.equal(copy.subtitle, null);
  });

  it("joins two children with an ampersand ahead of the connector", () => {
    const copy = personalizedBookCopy(kids("Dylan", "Mia"), alphabet);
    assert.equal(copy.title, "Dylan & Mia and the Great Alphabet Quest");
    assert.equal(copy.subtitle, null);
  });

  it("drops to the theme title for three children and names every child in the subtitle", () => {
    const copy = personalizedBookCopy(kids("Dylan", "Mia", "Leo"), alphabet);
    assert.equal(copy.title, "The Great Alphabet Quest");
    assert.equal(copy.subtitle, "Starring Dylan, Mia & Leo");
  });

  it("names all four children in the subtitle", () => {
    const copy = personalizedBookCopy(kids("Dylan", "Mia", "Leo", "Ava"), alphabet);
    assert.equal(copy.title, "The Great Alphabet Quest");
    assert.equal(copy.subtitle, "Starring Dylan, Mia, Leo & Ava");
  });

  it("preserves form order for two children", () => {
    const copy = personalizedBookCopy(kids("Mia", "Dylan"), alphabet);
    assert.equal(copy.title, "Mia & Dylan and the Great Alphabet Quest");
    assert.equal(copy.title.startsWith("Dylan"), false);
  });

  it("preserves form order for three or more children in the subtitle", () => {
    const copy = personalizedBookCopy(kids("Ava", "Leo", "Mia", "Dylan"), alphabet);
    assert.equal(copy.subtitle, "Starring Ava, Leo, Mia & Dylan");
  });

  it("trims names before formatting and does not rewrite them", () => {
    const copy = personalizedBookCopy(kids("  Dylan  "), alphabet);
    assert.equal(copy.title, "Dylan and the Great Alphabet Quest");
  });

  it("uses only the first word of a two-word name in the title", () => {
    const copy = personalizedBookCopy(kids("  Mary Jane  "), alphabet);
    assert.equal(copy.title, "Mary and the Great Alphabet Quest");
  });

  it("keeps full trimmed names in the subtitle for three or more children", () => {
    const copy = personalizedBookCopy(kids("  Mary Jane  ", "John Paul", "Ava Rose"), alphabet);
    assert.equal(copy.title, "The Great Alphabet Quest");
    assert.equal(copy.subtitle, "Starring Mary Jane, John Paul & Ava Rose");
  });

  it("falls back to the theme title when no name is usable", () => {
    assert.equal(personalizedBookCopy([], alphabet).title, "The Great Alphabet Quest");
    assert.equal(personalizedBookCopy(kids("   "), alphabet).title, "The Great Alphabet Quest");
  });
});

describe("coverLockup", () => {
  it("splits a title into the three lines the cover is lettered in", () => {
    assert.deepEqual(coverLockup("Mia and the Great Alphabet Quest"), {
      lead: "Mia",
      connector: "and the",
      rest: "Great Alphabet Quest",
    });
  });

  it("keeps both names on the lead line for a shared book", () => {
    assert.deepEqual(coverLockup("Mia & Theo and the Counting Carnival"), {
      lead: "Mia & Theo",
      connector: "and the",
      rest: "Counting Carnival",
    });
  });

  it("sets a title with no connector as one line", () => {
    assert.deepEqual(coverLockup("The Wild Woodland Wander"), {
      lead: null,
      connector: null,
      rest: "The Wild Woodland Wander",
    });
  });

  it("normalizes stray whitespace", () => {
    assert.deepEqual(coverLockup("  Mia   and the   Counting Carnival  "), {
      lead: "Mia",
      connector: "and the",
      rest: "Counting Carnival",
    });
  });

  it("splits on the first connector only", () => {
    const lockup = coverLockup("Mia and the Cat and the Hat");
    assert.equal(lockup.lead, "Mia");
    assert.equal(lockup.rest, "Cat and the Hat");
  });
});

describe("dedicationLine", () => {
  it("prefixes a giver with From", () => {
    assert.equal(dedicationLine("Grandma"), "From Grandma");
    assert.equal(dedicationLine("  Mom and Dad  "), "From Mom and Dad");
  });

  it("does not double the prefix", () => {
    assert.equal(dedicationLine("From Santa"), "From Santa");
    assert.equal(dedicationLine("from santa"), "from santa");
  });

  it("falls back to a neutral giver", () => {
    assert.equal(dedicationLine(""), `From ${DEFAULT_DEDICATION_GIVER}`);
    assert.equal(dedicationLine(null), `From ${DEFAULT_DEDICATION_GIVER}`);
    assert.equal(dedicationLine(undefined), `From ${DEFAULT_DEDICATION_GIVER}`);
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

  it("gives every track its own title phrase", () => {
    const phrases = TRACKS.map((track) => coverLockup(personalizedBookCopy(kids("Dylan"), track).title).rest);
    assert.equal(new Set(phrases).size, TRACKS.length);
  });

  it("keeps the lettered lines short enough to set on a cover", () => {
    for (const track of TRACKS) {
      for (const children of groups) {
        const { title } = personalizedBookCopy(children, track);
        const lockup = coverLockup(title);
        assert.ok(
          wordCount(lockup.rest) <= 4,
          `${track.slug} with ${children.length} children: "${lockup.rest}"`,
        );
        if (lockup.lead) {
          assert.ok(
            wordCount(lockup.lead) <= 3,
            `${track.slug} with ${children.length} children: "${lockup.lead}"`,
          );
        }
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

  it("names the child first on every single-child title", () => {
    for (const track of TRACKS) {
      const { title } = personalizedBookCopy(kids("Dylan"), track);
      assert.ok(title.startsWith("Dylan and the "), `${track.slug}: "${title}"`);
    }
  });
});
