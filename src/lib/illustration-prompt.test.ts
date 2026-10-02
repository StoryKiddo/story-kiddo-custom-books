import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getTrackBySlug } from "./tracks.ts";
import {
  ART_STYLE,
  BOTTOM_THIRD_CAPTION_RULE,
  ILLUSTRATION_MODEL,
  PAGE_COMPOSITIONS,
  PREVIEW_ILLUSTRATION_COUNT,
  buildImageEditRequestFields,
  buildIllustrationPrompt,
  compositionForPage,
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

  it("asks for painterly storybook craft, not 3D cartoon", () => {
    assert.match(ART_STYLE, /painterly/i);
    assert.match(ART_STYLE, /Do not force a mystical or enchanted look/i);
    assert.match(ART_STYLE, /Not plastic/i);
    assert.doesNotMatch(ART_STYLE, /3D animated/i);

    const prompt = buildIllustrationPrompt(manners, [mia], "Mia says please.", 0, 8);
    assert.match(prompt, /painterly/i);
    assert.doesNotMatch(prompt, /3D animated/i);
  });

  it("keeps the child's face in frame and uses a composition table that never repeats on neighbours", () => {
    const first = buildIllustrationPrompt(manners, [mia], "Mia says please.", 0, 8);
    const second = buildIllustrationPrompt(manners, [mia], "Mia waves.", 1, 8);
    const third = buildIllustrationPrompt(manners, [mia], "Mia runs.", 2, 8);

    for (const prompt of [first, second, third]) {
      assert.match(prompt, /head-and-shoulders or wider/);
      assert.match(prompt, /Never crop a face/);
      assert.match(prompt, /mask, goggles, or hat/);
      assert.match(prompt, /Do not add titles, captions, speech bubbles, watermarks/);
    }

    assert.match(first, /close shot, low angle/);
    assert.match(second, /wide shot, child small in the landscape/);
    assert.match(third, /over-the-shoulder from behind/);
    assert.notEqual(compositionForPage(0), compositionForPage(1));
  });

  it("omits the previous-page block on page 1 and includes the previous scene on later pages", () => {
    const first = buildIllustrationPrompt(manners, [mia], "Mia says please.", 0, 8, {
      previousPage: { text: "should not appear", scene: "a kitchen that must not leak" },
    });
    assert.doesNotMatch(first, /The previous page showed/);
    assert.doesNotMatch(first, /kitchen that must not leak/);

    const second = buildIllustrationPrompt(manners, [mia], "Mia waves.", 1, 8, {
      previousPage: {
        text: "Mia says please.",
        scene: "a sunny kitchen table with a blue mixing bowl",
      },
    });
    assert.match(second, /The previous page showed: a sunny kitchen table with a blue mixing bowl/);
    assert.match(second, /clearly different picture/);
    assert.match(second, /Do not reuse the previous page's composition, prop arrangement or pose/);
  });

  it("never repeats a composition entry on consecutive pages through a 26-page book", () => {
    assert.equal(PAGE_COMPOSITIONS.length >= 6, true);
    for (let index = 0; index < 25; index++) {
      assert.notEqual(
        compositionForPage(index),
        compositionForPage(index + 1),
        `pages ${index} and ${index + 1} share ${compositionForPage(index)}`,
      );
    }
    for (let index = 0; index <= 25; index++) {
      const prompt = buildIllustrationPrompt(manners, [mia], "Mia looks around.", index, 26);
      assert.match(prompt, /head-and-shoulders or wider/);
      assert.match(prompt, /face is fully visible/);
      assert.ok(prompt.includes(compositionForPage(index)));
    }
  });

  it("keeps clothing and palette while changing location, pose, and composition", () => {
    const prompt = buildIllustrationPrompt(
      manners,
      [mia],
      "Mia says please.",
      1,
      8,
      {
        continuity: {
          world_description: "a sunny kitchen",
          recurring_objects: ["blue mixing bowl"],
          clothing: "Mia's yellow raincoat",
        },
      },
    );
    assert.match(prompt, /The world's look, art style and palette stay the same/);
    assert.match(prompt, /location within that world, the pose, and the composition change on every page: a sunny kitchen/);
    assert.match(prompt, /Keep clothing consistent: Mia's yellow raincoat/);
    assert.match(prompt, /never make the same object the focal point on two pages in a row/);
    assert.doesNotMatch(prompt, /Keep the world consistent:/);
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

describe("previous-page wiring", () => {
  it("passes page i-1 text and scene into generatePageIllustration", () => {
    const generate = readFileSync(new URL("./generate-illustrations.ts", import.meta.url), "utf8");
    const runtime = readFileSync(new URL("./generation-runtime.ts", import.meta.url), "utf8");
    assert.match(generate, /previousPage:\s*options\.previousPage/);
    assert.match(generate, /text: options\.pages\[i - 1\]/);
    assert.match(generate, /scene: options\.pagePlan\?\.\[i - 1\]\?\.scene_description/);
    assert.match(runtime, /text: book\.pages\[pageIndex - 1\]/);
    assert.match(runtime, /pagePlan\[pageIndex - 1\]/);
    assert.match(generate, /pagePlanItem: options\.pagePlanItem/);
    assert.match(generate, /pagePlanItem: options\.pagePlan\?\.\[i\]/);
    assert.match(runtime, /pagePlanItem:/);
  });
});

describe("scene-plan image prompt", () => {
  it("builds the scene from plan fields and always adds the bottom-third rule", () => {
    const prompt = buildIllustrationPrompt(manners, [mia], "Mia waves.", 0, 8, {
      pagePlanItem: {
        letter: null,
        scene_description: "Mia waves from the garden path.",
        characters_present: ["Mia"],
        location: "garden path",
        time_and_light: "golden morning",
        camera_shot: "over-the-shoulder from behind",
        action: "waving at a bird",
        focus_object: "lantern",
        magic_moment: "the lantern glows",
        palette: "warm honey golds",
      },
    });
    assert.match(prompt, /Location: garden path/);
    assert.match(prompt, /Time and light: golden morning/);
    assert.match(prompt, /Palette: warm honey golds/);
    assert.match(prompt, /Compose this page as: over-the-shoulder from behind/);
    assert.match(prompt, /Action: waving at a bird/);
    assert.match(prompt, /Focus object: lantern/);
    assert.match(prompt, /A small magic moment: the lantern glows/);
    assert.ok(prompt.includes(BOTTOM_THIRD_CAPTION_RULE));
  });

  it("keeps the old prompt for pages without plan fields, plus the bottom-third rule", () => {
    const prompt = buildIllustrationPrompt(manners, [mia], "Mia says please.", 0, 8);
    const withoutCaptionRule = prompt.replace(`${BOTTOM_THIRD_CAPTION_RULE}\n`, "").replace(
      BOTTOM_THIRD_CAPTION_RULE,
      "",
    );
    assert.ok(prompt.includes(BOTTOM_THIRD_CAPTION_RULE));
    assert.match(withoutCaptionRule, /Compose this page as: close shot, low angle, child large in the foreground/);
    assert.doesNotMatch(withoutCaptionRule, /^Location:/m);
    assert.doesNotMatch(withoutCaptionRule, /Time and light:/);
    assert.doesNotMatch(withoutCaptionRule, /Palette:/);
    assert.match(withoutCaptionRule, /head-and-shoulders or wider/);
    assert.match(withoutCaptionRule, /Never crop a face/);
  });
});
