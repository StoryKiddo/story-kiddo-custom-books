import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTION_BODY_LIMIT_BYTES,
  CREATE_ORDER_MESSAGES,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
  isNextRedirectError,
  isPayloadOverActionLimit,
  isPhotoOverSizeLimit,
  messageForCreateOrderFailure,
  messageForPhotoUploadFailure,
} from "./create-order-errors.ts";

describe("photo limits", () => {
  it("uses an 8MB per-photo cap", () => {
    assert.equal(MAX_PHOTO_MB, 8);
    assert.equal(MAX_PHOTO_BYTES, 8 * 1024 * 1024);
    assert.equal(isPhotoOverSizeLimit(MAX_PHOTO_BYTES), false);
    assert.equal(isPhotoOverSizeLimit(MAX_PHOTO_BYTES + 1), true);
  });

  it("matches the 36MB Server Action body limit", () => {
    assert.equal(ACTION_BODY_LIMIT_BYTES, 36 * 1024 * 1024);
    assert.equal(isPayloadOverActionLimit(ACTION_BODY_LIMIT_BYTES), false);
    assert.equal(isPayloadOverActionLimit(ACTION_BODY_LIMIT_BYTES + 1), true);
  });
});

describe("isNextRedirectError", () => {
  it("detects Next redirect throws so callers can rethrow them", () => {
    assert.equal(
      isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/order/abc;303;" }),
      true,
    );
    assert.equal(isNextRedirectError(new Error("boom")), false);
    assert.equal(isNextRedirectError(null), false);
  });
});

describe("messageForCreateOrderFailure", () => {
  it("mentions the photo size limit in the too-large copy", () => {
    assert.match(CREATE_ORDER_MESSAGES.photoTooLarge, /under 8MB/);
    assert.match(CREATE_ORDER_MESSAGES.photoTooLarge, /cropping/);
  });

  it("maps oversized photos and 413 payloads", () => {
    assert.equal(
      messageForCreateOrderFailure(new Error("File too large")),
      CREATE_ORDER_MESSAGES.photoTooLarge,
    );
    assert.equal(
      messageForCreateOrderFailure({ message: "The object exceeded the maximum allowed size" }),
      CREATE_ORDER_MESSAGES.photoTooLarge,
    );
  });

  it("maps Server Action body-size failures separately from a single photo", () => {
    assert.equal(
      messageForCreateOrderFailure(
        new Error("Body exceeded 36mb limit.\nTo configure the body size limit for Server Actions"),
      ),
      CREATE_ORDER_MESSAGES.payloadTooLarge,
    );
  });

  it("maps invalid image types", () => {
    assert.equal(
      messageForCreateOrderFailure(new Error("Invalid mime type: application/pdf")),
      CREATE_ORDER_MESSAGES.photoType,
    );
  });

  it("maps network and timeout failures", () => {
    assert.equal(
      messageForCreateOrderFailure(new TypeError("Failed to fetch")),
      CREATE_ORDER_MESSAGES.network,
    );
    assert.equal(
      messageForCreateOrderFailure(new Error("fetch failed")),
      CREATE_ORDER_MESSAGES.network,
    );
    assert.equal(
      messageForCreateOrderFailure(new Error("The operation was aborted due to timeout")),
      CREATE_ORDER_MESSAGES.timeout,
    );
    assert.equal(
      messageForCreateOrderFailure({ message: "connect ETIMEDOUT" }),
      CREATE_ORDER_MESSAGES.timeout,
    );
  });

  it("maps storage upload problems to the photo-upload copy", () => {
    assert.equal(
      messageForCreateOrderFailure({ message: "Error uploading to storage bucket" }),
      CREATE_ORDER_MESSAGES.photoUpload,
    );
    assert.equal(
      messageForPhotoUploadFailure({ message: "something odd from storage" }),
      CREATE_ORDER_MESSAGES.photoUpload,
    );
  });

  it("maps database failures without a generic something-went-wrong page", () => {
    assert.equal(
      messageForCreateOrderFailure({
        message: "duplicate key value violates unique constraint",
        code: "23505",
      }),
      CREATE_ORDER_MESSAGES.database,
    );
  });

  it("falls back to a stay-on-the-form message, not a blank generic", () => {
    assert.equal(messageForCreateOrderFailure(new Error("???")), CREATE_ORDER_MESSAGES.generic);
    assert.match(CREATE_ORDER_MESSAGES.generic, /still here/);
    assert.doesNotMatch(CREATE_ORDER_MESSAGES.generic, /something went wrong/i);
  });
});
