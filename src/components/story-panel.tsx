/**
 * The panel a page's words are set in.
 *
 * Every page uses the same parchment treatment so captions blend into the
 * artwork — rounded corners, a soft edge, no hard white or gray box.
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
  return (
    <div className="relative mx-auto w-full max-w-[46rem]">
      <div className="story-parchment relative">
        <div className="relative px-1 py-2 sm:px-2 sm:py-3">{children}</div>
      </div>
    </div>
  );
}
