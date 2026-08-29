/**
 * Prompt + parse helpers for personalized story text.
 * Kept free of server-only so sample scripts can reuse the same wording.
 */

import type { Track } from "@/lib/tracks";

export const MIN_STORY_PAGES = 8;
export const MAX_STORY_PAGES = 12;
export const ALPHABET_PAGE_COUNT = 26;
export const ALPHABET_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
] as const;

export type StoryPageBounds = {
  min: number;
  max: number;
};

export function isAlphabetTheme(track: { slug: string }): boolean {
  return track.slug === "alphabet";
}

export function storyPageBounds(track: { slug: string }): StoryPageBounds {
  if (isAlphabetTheme(track)) {
    return { min: ALPHABET_PAGE_COUNT, max: ALPHABET_PAGE_COUNT };
  }
  return { min: MIN_STORY_PAGES, max: MAX_STORY_PAGES };
}

export type StoryChild = {
  name: string;
  age: number;
};

export type ThemeAgeRange = {
  youngest: number;
  oldest: number;
};

/** Pulls the low and high ages from copy like "Ages 2–6" or "Ages 3-8". */
export function parseThemeAgeRange(ageRange: string): ThemeAgeRange {
  const span = ageRange.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (span) {
    return {
      youngest: Number.parseInt(span[1], 10),
      oldest: Number.parseInt(span[2], 10),
    };
  }
  const single = ageRange.match(/(\d+)/);
  const age = single ? Number.parseInt(single[1], 10) : 2;
  return { youngest: age, oldest: age };
}

function joinChildren(children: StoryChild[]): string {
  return children
    .map((child) => `${child.name} (age ${child.age})`)
    .join(", ");
}

function complexityGuidance(youngest: number): string {
  if (youngest <= 2) {
    return `Write for a ${youngest}-year-old being read to — a toddler board-book, not a story for the oldest kids in the range.
- Very short lines (about 3 to 7 words).
- Concrete words a toddler knows: names, colors, animals, body parts, everyday objects you can point at.
- No abstract ideas, no long clauses, no "big" vocabulary.
- Rhythm a parent can bounce a toddler to.`;
  }

  if (youngest <= 3) {
    return `Write for a ${youngest}-year-old being read to — preschool read-aloud, not a story for the oldest kids in the range.
- Short lines (about 5 to 10 words).
- Still concrete. Simple feeling words are fine (kind, share, help, hug, sad, glad).
- Slightly more story than a toddler book, but sentences stay short and easy to hear aloud.`;
  }

  return `Write for a ${youngest}-year-old being read to — not for the oldest kids in the range.
- Short, clear sentences a parent can read aloud.
- Concrete first; a little more description is fine.
- Simple words. No lectures.`;
}

export const STORY_SYSTEM_PROMPT = `You write personalized picture-book verse for Story Kiddo Custom Books.

Voice:
- Warm, positive, playful read-alouds in the cadence of classic children's books (nursery-rhyme bounce or a gentle Dr. Seuss beat — never copy a specific book or character).
- Most lines rhyme. Prefer simple AABB or ABAB. It does not have to be perfect on every single line, but the majority of the story must have a clear rhythm and rhyme a parent can hear.
- No scares, no violence, no brand names, no mention of AI.
- Use each child's real name exactly as given.
- Match the educational theme in a playful way — never a lecture.`;

export function buildStoryPrompt(track: Track, children: StoryChild[]): string {
  const range = parseThemeAgeRange(track.ageRange);
  const stars = joinChildren(children);
  const together =
    children.length > 1
      ? `This book stars more than one child. Weave every named child into the same rhyming story as real characters sharing the adventure. None of them is a background extra or left out of the verse. The rhyme scheme and the youngest-age complexity rules still apply.`
      : `The named child is the star of every page. Fit their name naturally into the rhyming lines.`;

  return `Educational theme: ${track.name}
Theme focus: ${track.description}
Theme age range: ${track.ageRange}

Write vocabulary, sentence length, and complexity for the YOUNGEST age in that range: age ${range.youngest} (not age ${range.oldest}, and not only the oldest child listed). A parent reading this to a ${range.youngest}-year-old must be able to use it as-is.

${complexityGuidance(range.youngest)}

Children starring in this book: ${stars}

${together}

Rhyme and rhythm:
- Most lines must rhyme (AABB or ABAB).
- Each page is 2 to 4 short rhyming lines a parent can read aloud.
- Put each line on its own newline inside that page's string.
- End rhymes should be obvious when spoken (day/play, cat/hat). Skip a rhyme rather than twist the story into nonsense.

${pageCountGuidance(track)}

Return JSON with a "pages" array of strings, one string per page.`;
}

function pageCountGuidance(track: Track): string {
  if (isAlphabetTheme(track)) {
    const letters = ALPHABET_LETTERS.join(", ");
    return `This is an Alphabet book. Write EXACTLY ${ALPHABET_PAGE_COUNT} pages — one page per letter, in order from A to Z.
- Page 1 is A, page 2 is B, page 3 is C, … page 26 is Z.
- Cover every letter: ${letters}.
- Do not skip a letter, merge two letters onto one page, or stop early (do not end at J or anywhere before Z).
- On each page, show that page's letter clearly (for example "A is for ant") plus a simple word that starts with it, starring the child.
- Keep the rhyme and youngest-age complexity rules on every letter page.`;
  }

  return `Write a short story of ${MIN_STORY_PAGES} to ${MAX_STORY_PAGES} pages.`;
}

export function parseStoryPages(
  raw: string,
  bounds: StoryPageBounds = { min: MIN_STORY_PAGES, max: MAX_STORY_PAGES },
): string[] {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = undefined;
  }

  if (parsed !== undefined) {
    const fromObject =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? asPageList((parsed as { pages?: unknown }).pages, bounds.max)
        : null;
    const fromArray = asPageList(parsed, bounds.max);
    const pages = fromObject ?? fromArray;
    if (pages) {
      return finalizePages(pages, bounds);
    }
  }

  const pages = trimmed
    .split(/\n\s*\n/)
    .map((page) => page.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((page) => page.length > 0);

  return finalizePages(pages, bounds);
}

function finalizePages(pages: string[], bounds: StoryPageBounds): string[] {
  const clipped = pages.slice(0, bounds.max);
  if (clipped.length < bounds.min) {
    throw new Error(
      `The story model returned ${clipped.length} pages; expected at least ${bounds.min}.`,
    );
  }
  return clipped;
}

function asPageList(value: unknown, maxPages: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value
    .map((page) => (typeof page === "string" ? page.trim() : ""))
    .filter((page) => page.length > 0);
  return pages.length > 0 ? pages.slice(0, maxPages) : null;
}

/** Letters that are missing or not clearly featured on their page (A=page 1). */
export function missingAlphabetLetters(pages: string[]): string[] {
  const missing: string[] = [];
  for (let i = 0; i < ALPHABET_PAGE_COUNT; i++) {
    const letter = ALPHABET_LETTERS[i];
    const page = pages[i];
    if (!page || !pageHighlightsLetter(page, letter)) {
      missing.push(letter);
    }
  }
  return missing;
}

function pageHighlightsLetter(page: string, letter: string): boolean {
  const escaped = letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const asOwnWord = new RegExp(`(?:^|[^A-Za-z])${escaped}(?:[^A-Za-z]|$)`, "i");
  const isFor = new RegExp(`(?:^|\\n)\\s*${escaped}\\s+is\\s+for\\b`, "i");
  return asOwnWord.test(page) || isFor.test(page);
}
