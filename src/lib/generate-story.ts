/**
 * Server-only helper that writes a short personalized story via the Anthropic API.
 * Never import this file from a Client Component.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Track } from "@/lib/tracks";

const STORY_MODEL = "claude-sonnet-4-5";
const MIN_PAGES = 8;
const MAX_PAGES = 12;

const SYSTEM_PROMPT = `You write personalized picture-book text for Story Kiddo Custom Books.
Write warm, age-appropriate, positive read-aloud stories.
No scares, no violence, no brand names, no mention of AI.
Use each child's real name exactly as given.
Match the educational theme in a playful way — never a lecture.`;

export type StoryChild = {
  name: string;
  age: number;
};

export function getAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(getAnthropicApiKey());
}

function joinChildren(children: StoryChild[]): string {
  return children
    .map((child) => `${child.name} (age ${child.age})`)
    .join(", ");
}

function youngestAge(children: StoryChild[]): number {
  return Math.min(...children.map((child) => child.age));
}

function buildPrompt(track: Track, children: StoryChild[]): string {
  const stars = joinChildren(children);
  const together =
    children.length > 1
      ? `Include every named child as a character in the same story. They share the adventure together — none of them is left out.`
      : `The named child is the star of every page.`;

  return `Educational theme: ${track.name}
Theme focus: ${track.description}

Children starring in this book: ${stars}
Write for a read-aloud audience around age ${youngestAge(children)}.

${together}

Write a short story of ${MIN_PAGES} to ${MAX_PAGES} pages.
Each page is 2 to 5 short sentences a parent can read aloud.

Return JSON with a "pages" array of strings, one string per page.`;
}

function asPageList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const pages = value
    .map((page) => (typeof page === "string" ? page.trim() : ""))
    .filter((page) => page.length > 0);
  return pages.length > 0 ? pages.slice(0, MAX_PAGES) : null;
}

function parsePages(raw: string): string[] {
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

  return pages.slice(0, MAX_PAGES);
}

export async function generateStoryPages(
  track: Track,
  children: StoryChild[],
): Promise<string[]> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const request = {
    model: STORY_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content: buildPrompt(track, children) }],
  };
  const structuredFormat = {
    type: "json_schema" as const,
    schema: {
      type: "object",
      properties: {
        pages: {
          type: "array",
          items: { type: "string" },
          minItems: MIN_PAGES,
          maxItems: MAX_PAGES,
        },
      },
      required: ["pages"],
      additionalProperties: false,
    },
  };

  let message;
  try {
    message = await client.messages.create({
      ...request,
      output_config: { format: structuredFormat },
    });
  } catch (error) {
    console.error("Structured story request failed, retrying without schema", error);
    message = await client.messages.create(request);
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("The story model returned no text.");
  }

  return parsePages(text);
}
