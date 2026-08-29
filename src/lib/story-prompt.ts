/**
 * Prompt + parse helpers for personalized story text.
 * Kept free of server-only so sample scripts can reuse the same wording.
 */

import type { Track } from "@/lib/tracks";

export const MIN_STORY_PAGES = 8;
export const MAX_STORY_PAGES = 12;

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

Write a short story of ${MIN_STORY_PAGES} to ${MAX_STORY_PAGES} pages.

Return JSON with a "pages" array of strings, one string per page.`;
}

export function parseStoryPages(raw: string): string[] {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const fromObject =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? asPageList((parsed as { pages?: unknown }).pages)
        : null;
    const fromArray = asPageList(parsed);
    const pages = fromObject ?? fromArray;
    if (pages) return pages;
  } catch {
    // Fall through to paragraph splitting.
  }

  const pages = trimmed
    .split(/\n\s*\n/)
    .map((page) => page.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((page) => page.length > 0);

  if (pages.length === 0) {
    throw new Error("The story model returned empty text.");
  }

  return pages.slice(0, MAX_STORY_PAGES);
}

function asPageList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value
    .map((page) => (typeof page === "string" ? page.trim() : ""))
    .filter((page) => page.length > 0);
  return pages.length > 0 ? pages.slice(0, MAX_STORY_PAGES) : null;
}
