/**
 * Friendly, specific copy for create-a-book failures.
 *
 * Keep this module free of `"use server"` so the form can share the same
 * limits and messages as the Server Action without pulling server code.
 */

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTO_MB = 8;
/** Matches `experimental.serverActions.bodySizeLimit` in next.config.ts. */
export const ACTION_BODY_LIMIT_BYTES = 36 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export const CREATE_ORDER_MESSAGES = {
  photoTooLarge: `That photo is a bit too large — please use a photo under ${MAX_PHOTO_MB}MB, or try cropping it smaller.`,
  photoType: "Please upload a JPG, PNG, or WebP photo.",
  photoMissing: "Please add a photo of each child and crop it to their face.",
  photoRead: "We couldn't read that photo. Please try another image.",
  photoUpload:
    "We had trouble uploading your photo. Please check your connection and try again.",
  network:
    "We had trouble reaching our servers. Please check your connection and try again.",
  timeout: "That took a bit too long. Please check your connection and try again.",
  payloadTooLarge: `Those photos together are a bit large — please use photos under ${MAX_PHOTO_MB}MB each, or try cropping them smaller.`,
  themeMissing: "Please choose an educational theme before continuing.",
  themeNotInDb: "We couldn't find that theme. Please pick a theme again from the list.",
  nameInvalid: "Please enter each child's first name (up to 40 characters).",
  ageInvalid: "Please enter an age between 0 and 12 for each child.",
  childCount: "Please add between 1 and 4 children to this book.",
  childIncomplete: "Each child needs a name, age, and photo.",
  database:
    "We couldn't save your order just now. Your details are still here — please try again.",
  childrenSave:
    "We saved your photos but couldn't attach them to the order. Your details are still here — please try again.",
  generic:
    "We couldn't finish saving your book just now. Your details are still here — please try again.",
} as const;

export function isAllowedPhotoType(type: string): boolean {
  return ALLOWED_PHOTO_TYPES.has(type);
}

export function isPhotoOverSizeLimit(size: number): boolean {
  return size > MAX_PHOTO_BYTES;
}

export function isPayloadOverActionLimit(totalBytes: number): boolean {
  return totalBytes > ACTION_BODY_LIMIT_BYTES;
}

/** Next's `redirect()` throws; callers must rethrow this or navigation is swallowed. */
export function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? error.digest : undefined;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function errorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause =
      "cause" in error && error.cause != null ? errorText(error.cause) : "";
    return [error.name, error.message, cause].filter(Boolean).join(" ");
  }
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    return [obj.message, obj.error, obj.code, obj.details, obj.hint, obj.statusCode]
      .filter((value) => typeof value === "string" || typeof value === "number")
      .map(String)
      .join(" ");
  }
  return String(error);
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

/**
 * Map an unexpected throw / storage / network failure to a specific
 * customer-facing sentence. Prefer calling this only for unknown errors;
 * validation paths should return `CREATE_ORDER_MESSAGES` directly.
 */
export function messageForCreateOrderFailure(error: unknown): string {
  const text = errorText(error).toLowerCase();

  if (
    includesAny(text, [
      "body exceeded",
      "bodysizelimit",
      "request entity too large",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.payloadTooLarge;
  }

  if (
    includesAny(text, [
      "file too large",
      "maximum allowed size",
      "object exceeded",
      "payload too large",
      "413",
      "too large",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.photoTooLarge;
  }

  if (
    includesAny(text, [
      "invalid mime",
      "mime type",
      "invalid content type",
      "unsupported media",
      "not a valid image",
      "expected image/jpeg",
      "image/png",
      "image/webp",
    ]) &&
    includesAny(text, ["mime", "type", "image", "media"])
  ) {
    return CREATE_ORDER_MESSAGES.photoType;
  }

  if (
    includesAny(text, [
      "etimedout",
      "timeout",
      "timed out",
      "aborted",
      "abort",
      "und_err_connect_timeout",
      "und_err_headers_timeout",
      "und_err_body_timeout",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.timeout;
  }

  if (
    includesAny(text, [
      "failed to fetch",
      "networkerror",
      "network request failed",
      "load failed",
      "econnreset",
      "econnrefused",
      "enotfound",
      "eai_again",
      "socket hang up",
      "fetch failed",
      "und_err_connect",
      "und_err_socket",
      "network",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.network;
  }

  if (
    includesAny(text, [
      "storage",
      "upload",
      "child-photos",
      "bucket",
      "object",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.photoUpload;
  }

  if (
    includesAny(text, [
      "couldn't read that photo",
      "could not read",
      "arraybuffer",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.photoRead;
  }

  if (
    includesAny(text, [
      "postgres",
      "pgrst",
      "supabase",
      "duplicate key",
      "violates",
      "jwt",
      "row-level security",
      "database",
    ])
  ) {
    return CREATE_ORDER_MESSAGES.database;
  }

  return CREATE_ORDER_MESSAGES.generic;
}

export function messageForPhotoUploadFailure(error: unknown): string {
  const mapped = messageForCreateOrderFailure(error);
  if (mapped === CREATE_ORDER_MESSAGES.generic) {
    return CREATE_ORDER_MESSAGES.photoUpload;
  }
  return mapped;
}
