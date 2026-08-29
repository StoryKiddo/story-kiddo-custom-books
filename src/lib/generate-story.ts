/**
 * Server-only helper that writes a short personalized story via the Anthropic API.
 * Never import this file from a Client Component.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Track } from "@/lib/tracks";
import {
  MAX_STORY_PAGES,
  MIN_STORY_PAGES,
  STORY_SYSTEM_PROMPT,
  buildStoryPrompt,
  parseStoryPages,
  type StoryChild,
} from "@/lib/story-prompt";

const STORY_MODEL = "claude-sonnet-4-5";

export type { StoryChild };

export function getAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(getAnthropicApiKey());
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
    system: STORY_SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content: buildStoryPrompt(track, children) }],
  };
  const structuredFormat = {
    type: "json_schema" as const,
    schema: {
      type: "object",
      properties: {
        pages: {
          type: "array",
          items: { type: "string" },
          minItems: MIN_STORY_PAGES,
          maxItems: MAX_STORY_PAGES,
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

  return parseStoryPages(text);
}
