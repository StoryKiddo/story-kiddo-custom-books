/**
 * Server-only helper that writes a personalized story via Anthropic.
 * Blueprint is generated first (internal only), then pages are written from it.
 * Parents never see a concept-preview or approval step.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Track } from "@/lib/tracks";
import type { StoryTypeId } from "@/lib/personalization";
import { DEFAULT_STORY_TYPE } from "@/lib/personalization";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  PAGES_SYSTEM_PROMPT,
  buildBlueprintPrompt,
  buildPagesPrompt,
  continuityFromBlueprint,
  parseBlueprint,
  parseGeneratedPages,
  toNormalizedChildren,
  type BookContinuity,
  type PagePlanItem,
  type StoryBlueprint,
  type StoryChildInput,
} from "@/lib/story-blueprint";
import {
  isAlphabetTheme,
  parseStoryPages,
  storyPageBounds,
} from "@/lib/story-prompt";

const STORY_MODEL = "claude-sonnet-4-5";

export type { StoryChildInput };

export type GeneratedStory = {
  pages: string[];
  blueprint: StoryBlueprint;
  continuity: BookContinuity;
  pagePlan: PagePlanItem[];
};

export function getAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(getAnthropicApiKey());
}

function textFromMessage(message: {
  content: { type: string; text?: string }[];
  stop_reason?: string | null;
}): string {
  if (message.stop_reason === "max_tokens") {
    throw new Error("The story model ran out of room before finishing.");
  }
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("\n")
    .trim();
}

async function completeJson(
  client: Anthropic,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const message = await client.messages.create({
    model: STORY_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user" as const, content: user }],
  });

  const text = textFromMessage(message);
  if (!text) {
    throw new Error("The story model returned no text.");
  }
  return text;
}

export async function generateStoryPages(
  track: Track,
  children: StoryChildInput[],
  storyType: StoryTypeId = DEFAULT_STORY_TYPE,
): Promise<GeneratedStory> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const bounds = storyPageBounds(track);
  const normalized = toNormalizedChildren(children, storyType);
  const client = new Anthropic({ apiKey });

  const blueprintText = await completeJson(
    client,
    BLUEPRINT_SYSTEM_PROMPT,
    buildBlueprintPrompt(track, normalized, storyType),
    4096,
  );
  const blueprint = parseBlueprint(blueprintText);

  const pagesText = await completeJson(
    client,
    PAGES_SYSTEM_PROMPT,
    buildPagesPrompt(track, normalized, storyType, blueprint),
    isAlphabetTheme(track) ? 16384 : 8192,
  );

  const parsed = parseGeneratedPages(pagesText);
  let pageTexts = parsed.pageTexts;
  if (pageTexts.length === 0) {
    pageTexts = parseStoryPages(pagesText, bounds);
  } else {
    pageTexts = parseStoryPages(JSON.stringify({ pages: pageTexts }), bounds);
  }

  const pagePlan =
    parsed.pagePlan.length === pageTexts.length
      ? parsed.pagePlan
      : pageTexts.map((text, index) => parsed.pagePlan[index] ?? {
          letter: isAlphabetTheme(track) ? String.fromCharCode(65 + index) : null,
          scene_description: text,
          characters_present: children.map((child) => child.name),
        });

  const continuity = parsed.continuity ?? continuityFromBlueprint(blueprint);

  return {
    pages: pageTexts,
    blueprint,
    continuity,
    pagePlan,
  };
}
