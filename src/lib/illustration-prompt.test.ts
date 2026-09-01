import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTrackBySlug } from "./tracks.ts";
import {
  ART_STYLE,
  ILLUSTRATION_MODEL,
  PREVIEW_ILLUSTRATION_COUNT,
  buildImageEditRequestFields,
  buildIllustrationPrompt,
  describeIllustrationApiError,
  illustrationSlot,
  previewGenerationSucceeded,
  previewIllustrationCount,
  type IllustrationChild,
} from "./illustration-prompt.ts";

const manners = getTrackBySlug("manners")!;
const alphabet = getTrackBySlug("alphabet")!;

const mia: IllustrationChild = {
  name: "Mia",
  age: 4,
  photoPath: "cust/mia.jpg",
};
const leo: IllustrationChild = {
  name: "Leo",
  age: 6,
  photoPath: "cust/leo.png",
};

describe("gpt-image-2 illustration request", () => {
  it("uses gpt-image-2 and never a deprecated gpt-image-1 family model", () => {
    const fields = buildImageEditRequestFields("a prompt");
    assert.equal(ILLUSTRATION_MODEL, "gpt-image-2");
    assert.equal(fields.model, "gpt-image-2");
    assert.notEqual(fields.model, "gpt-image-1");
    assert.notEqual(fields.model, "gpt-image-1.5");
  });

  it("omits input_fidelity because gpt-image-2 always uses high-fidelity inputs", () => {
    const fields = buildImageEditRequestFields("a prompt");
    assert.equal("input_fidelity" in fields, false);
    assert.equal(fields.size, "1024x1536");
    assert.equal(fields.quality, "medium");
    assert.equal(fields.output_format, "png");
    assert.equal(fields.n, 1);
  });
});

describe("illustration prompt", () => {
  it("can add scene and continuity notes without dropping Image 1 identity mapping", () => {
    const prompt = buildIllustrationPrompt(
      manners,
      [mia, leo],
      "Mia and Leo take turns.",
      0,
      8,
      {
        sceneDescription: "Grandma's kitchen with a blue mixing bowl on the table.",
        continuity: {
          world_description: "a sunny kitchen",
          recurring_objects: ["blue mixing bowl"],
          clothing: "Mia's yellow raincoat",
        },
      },
    );
    assert.match(prompt, /Image 1[\s\S]*Mia \(age 4\)/);
    assert.match(prompt, /Image 2[\s\S]*Leo \(age 6\)/);
    assert.match(prompt, /blue mixing bowl/);
    assert.match(prompt, /yellow raincoat/);
    assert.match(prompt, /Scene notes for the illustrator/);
  });

  it("asks for a 3D animated children's-book style, not watercolor", () => {
    assert.match(ART_STYLE, /3D animated/i);
    assert.doesNotMatch(ART_STYLE, /watercolor/i);
    assert.doesNotMatch(ART_STYLE, /pencil-sketch/i);

    const prompt = buildIllustrationPrompt(manners, [mia], "Mia says please.", 0, 8);
    assert.match(prompt, /3D animated/i);
    assert.doesNotMatch(prompt, /watercolor/i);
  });

  it("maps a single child to Image 1 and locks identity to that photo", () => {
    const prompt = buildIllustrationPrompt(manners, [mia], "Mia says please.", 0, 8);
    assert.match(prompt, /Image 1/);
    assert.match(prompt, /Mia \(age 4\)/);
    assert.match(prompt, /identity|likeness|face/i);
    assert.match(prompt, /reference/i);
    assert.doesNotMatch(prompt, /Image 2/);
  });

  it("maps each child to a numbered reference image and keeps them together", () => {
    const prompt = buildIllustrationPrompt(
      manners,
      [mia, leo],
      "Mia and Leo take turns.",
      2,
      8,
    );
    assert.match(prompt, /Image 1[\s\S]*Mia \(age 4\)/);
    assert.match(prompt, /Image 2[\s\S]*Leo \(age 6\)/);
    assert.match(prompt, /every named child together/i);
    assert.match(prompt, /Do not mix identities/i);
  });

  it("allows a hand-lettered letter prop on alphabet pages", () => {
    const prompt = buildIllustrationPrompt(
      alphabet,
      [mia],
      "A is for ant with Mia.",
      0,
      26,
    );
    assert.match(prompt, /letter/i);
    assert.match(prompt, /page 1 of 26/i);
  });
});

describe("describeIllustrationApiError", () => {
  it("flags permission and missing-model errors as gpt-image-2 access problems", () => {
    const permission = describeIllustrationApiError({
      status: 403,
      code: "model_not_found",
      message: "You do not have access to model gpt-image-2",
    });
    assert.equal(permission.isAccessError, true);
    assert.match(permission.message, /gpt-image-2/i);
    assert.match(permission.message, /organization verification|usage tier|permission/i);

    const verified = describeIllustrationApiError({
      status: 403,
      message: "Your organization must be verified to use this model",
    });
    assert.equal(verified.isAccessError, true);

    const other = describeIllustrationApiError(new Error("rate limit exceeded"));
    assert.equal(other.isAccessError, false);
  });
});

describe("preview illustration limit", () => {
  it("only paints the first two pages, even for a long book", () => {
    assert.equal(PREVIEW_ILLUSTRATION_COUNT, 2);
    assert.equal(previewIllustrationCount(12), 2);
    assert.equal(previewIllustrationCount(26), 2);
    assert.equal(previewIllustrationCount(1), 1);
    assert.equal(previewIllustrationCount(0), 0);
  });

  it("treats preview as done only when those first pages have images", () => {
    assert.equal(previewGenerationSucceeded([null, null, null], 8), false);
    assert.equal(
      previewGenerationSucceeded(["book/page-01.png", null, null], 8),
      false,
    );
    assert.equal(
      previewGenerationSucceeded(["book/page-01.png", "book/page-02.png", null], 8),
      true,
    );
    assert.equal(previewGenerationSucceeded(["book/page-01.png"], 1), true);
  });

  it("shows only images or loading on the first two pages, and plain text after", () => {
    assert.equal(illustrationSlot(0, true, false), "image");
    assert.equal(illustrationSlot(1, false, true), "loading");
    assert.equal(illustrationSlot(2, false, true), "none");
    assert.equal(illustrationSlot(5, false, false), "none");
    assert.equal(illustrationSlot(0, false, false), "none");
  });
});
