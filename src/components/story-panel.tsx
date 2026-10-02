/**
 * Caption overlay for a story page. Sits on the artwork over a fading scrim.
 * No plate, no parchment image, no border — the picture is the page.
 */

import type { ReactNode } from "react";
import type { Track } from "@/lib/tracks";

export type PanelKind = "scroll" | "cloud" | "sign" | "paper";

type PanelTrack = Pick<Track, "slug" | "art">;

export function StoryPanel({
  children,
}: {
  track: PanelTrack;
  children: ReactNode;
  kind?: PanelKind;
}) {
  return <div className="story-caption-scrim">{children}</div>;
}
