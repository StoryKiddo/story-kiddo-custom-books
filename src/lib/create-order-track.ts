/**
 * Which theme a create-order request is allowed to use.
 *
 * Kept out of the Server Action file so tests can cover the launch guard
 * without importing `"use server"` code.
 */

import { CREATE_ORDER_MESSAGES } from "./create-order-errors.ts";
import { getTrackBySlug, isLaunchTrack, type Track } from "./tracks.ts";

export function resolveCreateOrderTrack(
  slug: string,
): { track: Track } | { error: string } {
  const track = getTrackBySlug(slug);
  if (!track) {
    return { error: CREATE_ORDER_MESSAGES.themeMissing };
  }
  if (!isLaunchTrack(track.slug)) {
    return { error: CREATE_ORDER_MESSAGES.themeNotLaunching };
  }
  return { track };
}
